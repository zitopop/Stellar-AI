import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../lib/auth.js';
import { createJarvisMissionHandler } from '../lib/jarvis-mission-handler.js';

test('mission API authenticates owner, rejects a forged owner payload and protects cron', async () => {
  const previous = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = 'test-only-jarvis-session-secret';
  let called = 0, passedOwner;
  const service = { status: async email => { called++; passedOwner = email; return { missions: [] }; }, tick: async () => { called++; return { processed: 0 }; } };
  const handler = createJarvisMissionHandler({ service, env: { CRON_SECRET: 'cron-fixture' } });
  const invoke = async (headers = {}, body = { action: 'status', owner: true }, query = {}, method = 'POST') => {
    const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ headers, body, query, method }, res); return res;
  };
  try {
    assert.equal((await invoke()).code, 401);
    assert.equal((await invoke({ authorization: `Bearer ${createSession('visitor@example.com')}` })).code, 403);
    assert.equal(called, 0);
    assert.equal((await invoke({ authorization: `Bearer ${createSession('tobi@trystellarai.com')}` })).code, 200);
    assert.equal(passedOwner, 'tobi@trystellarai.com');
    assert.equal((await invoke({}, {}, { action: 'worker' }, 'GET')).code, 401);
    assert.equal((await invoke({ authorization: 'Bearer cron-fixture' }, {}, { action: 'worker' }, 'GET')).code, 200);
    const unconfigured = createJarvisMissionHandler({ service, env: {} });
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await unconfigured({ method: 'GET', query: { action: 'worker' }, headers: { authorization: 'Bearer undefined' } }, res);
    assert.equal(res.code, 401);
  } finally { if (previous === undefined) delete process.env.AUTH_SESSION_SECRET; else process.env.AUTH_SESSION_SECRET = previous; }
});
