import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../lib/auth.js';
import { handleAccountDeletionRequest } from '../lib/account-deletion-handler.js';

const EMAIL = 'customer@example.test';
const ROOT = 'https://kv.example.test';
const QUEUE = 'stellar:account-deletion:queue';
const PREFIX = 'stellar:account-deletion:request:';

function response() {
  return {
    code: 200,
    body: null,
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('authenticated deletion request retries failed queue indexing without duplicating records', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.AUTH_SESSION_SECRET;
  const originalResend = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  process.env.AUTH_SESSION_SECRET = 'unit-test-only-session-secret';
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  const key = PREFIX + EMAIL;
  const records = new Map();
  const queue = [];
  let failIndexOnce = true;

  globalThis.fetch = async (target, options = {}) => {
    const url = String(target);
    if (url.startsWith(ROOT + '/get/')) {
      const name = decodeURIComponent(url.slice((ROOT + '/get/').length));
      return new Response(JSON.stringify({ result: records.get(name) ?? null }), { status: 200 });
    }
    if (url === ROOT + '/pipeline') {
      const commands = JSON.parse(options.body);
      const results = commands.map(([op, ...args]) => {
        if (op === 'SET') {
          const [name, value, mode] = args;
          if (mode === 'NX' && records.has(name)) return { result: null };
          records.set(name, value);
          return { result: 'OK' };
        }
        if (op === 'LRANGE') return { result: [...queue] };
        if (op === 'LPUSH') {
          if (failIndexOnce) { failIndexOnce = false; return { error: 'temporary indexing error' }; }
          queue.unshift(String(args[1]));
          return { result: queue.length };
        }
        return { error: 'unsupported test operation' };
      });
      return new Response(JSON.stringify(results), { status: 200 });
    }
    throw new Error('Unexpected outbound network request: ' + url);
  };

  try {
    const token = createSession(EMAIL);
    const req = (action, confirm = 'DELETE') => ({
      headers: { authorization: 'Bearer ' + token },
      body: { action, confirm },
    });

    const first = response();
    await handleAccountDeletionRequest(req('requestAccountDeletion'), first, ROOT, 'unit-token');
    assert.equal(first.code, 503, 'must not claim request fully indexed');
    assert.equal(records.has(key), true, 'the original durable request remains recorded');
    assert.equal(queue.length, 0);

    const retry = response();
    await handleAccountDeletionRequest(req('requestAccountDeletion'), retry, ROOT, 'unit-token');
    assert.equal(retry.code, 200);
    assert.equal(retry.body.requested, true);
    assert.equal(retry.body.status, 'pending');
    assert.deepEqual(queue, [EMAIL]);

    const again = response();
    await handleAccountDeletionRequest(req('requestAccountDeletion'), again, ROOT, 'unit-token');
    assert.equal(again.code, 200);
    assert.deepEqual(queue, [EMAIL], 'retries must not duplicate queue entries');

    const current = response();
    await handleAccountDeletionRequest(req('getDeletionRequestStatus'), current, ROOT, 'unit-token');
    assert.equal(current.code, 200);
    assert.equal(current.body.status, 'pending');

    const notOwner = response();
    await handleAccountDeletionRequest(req('listDeletionRequests'), notOwner, ROOT, 'unit-token');
    assert.equal(notOwner.code, 403);

    const noAuth = response();
    await handleAccountDeletionRequest({ headers: {}, body: { action: 'requestAccountDeletion', confirm: 'DELETE' } }, noAuth, ROOT, 'unit-token');
    assert.equal(noAuth.code, 401);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = originalSecret;
    if (originalResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResend;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
  }
});
