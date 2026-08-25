import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RETURN_SESSION_GAP_MS,
  applySuccessfulGenerationFunnel,
  initialFunnelState,
  recordFunnelSignup,
} from '../lib/funnel-metrics.js';

const originalFetch = globalThis.fetch;

test('new-signup funnel writes use opaque aggregate membership only', async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: true, json: async () => [{ result: 1 }, { result: 1 }] };
  };

  assert.equal(await recordFunnelSignup({ url: 'https://kv.test', token: 'token', email: 'builder@example.com', createdAt: Date.UTC(2026, 7, 25) }), true);
  const payload = String(calls[0].options.body);
  assert.match(payload, /stellar:funnel:signup:2026-08-25/);
  assert.match(payload, /stellar:funnel:tracked-identities/);
  assert.doesNotMatch(payload, /builder@example\.com/);
});

test('first successful generation is the activation event and returns remain cohort-safe', () => {
  const signupAt = Date.UTC(2026, 7, 25, 9, 0, 0);
  const user = { createdAt: signupAt, funnel: initialFunnelState(signupAt) };
  const first = applySuccessfulGenerationFunnel({ email: 'builder@example.com', user, now: signupAt + (10 * 60 * 1000) });

  assert.equal(first.funnel.firstGenerationAt, signupAt + (10 * 60 * 1000));
  assert.equal(first.funnel.secondSessionAt, 0);
  assert.ok(first.commands.some((command) => command[1] === 'stellar:funnel:activated-within-24h:2026-08-25'));
  assert.ok(first.commands.some((command) => command[1] === 'stellar:funnel:active:2026-08-25'));

  const returned = applySuccessfulGenerationFunnel({
    email: 'builder@example.com',
    user: { ...user, funnel: first.funnel },
    now: signupAt + DAY_MS + RETURN_SESSION_GAP_MS,
  });
  assert.equal(returned.funnel.secondSessionAt, signupAt + DAY_MS + RETURN_SESSION_GAP_MS);
  assert.ok(returned.commands.some((command) => command[1] === 'stellar:funnel:retained-d1:2026-08-25'));
  assert.ok(returned.commands.some((command) => command[1] === 'stellar:funnel:second-session-within-7d:2026-08-25'));
});

test('pre-instrumentation accounts remain legacy observers instead of receiving invented activation dates', () => {
  const update = applySuccessfulGenerationFunnel({
    email: 'existing@example.com',
    user: { createdAt: Date.UTC(2026, 6, 1), scriptCount: 4 },
    now: Date.UTC(2026, 7, 25),
  });
  assert.equal(update.tracked, false);
  assert.equal(update.funnel.legacy, true);
  assert.equal(update.funnel.firstGenerationAt, undefined);
  assert.deepEqual(update.commands, []);
});

const DAY_MS = 24 * 60 * 60 * 1000;


test('owner-only funnel metrics return aggregate cohorts and reject ordinary accounts', async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.AUTH_SESSION_SECRET;
    delete process.env.OWNER_EMAILS;
  });
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'token';
  process.env.AUTH_SESSION_SECRET = 'funnel-owner-secret';
  process.env.OWNER_EMAILS = 'owner@example.com';
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('/keys/')) return { ok: true, json: async () => ({ result: ['stellar:user:opaque'] }) };
    const commands = JSON.parse(options.body || '[]');
    if (commands[0]?.[0] === 'GET') return { ok: true, json: async () => [{ result: JSON.stringify({ scriptCount: 2, funnel: { legacy: true } }) }] };
    return { ok: true, json: async () => commands.map(() => ({ result: 0 })) };
  };

  const { createSession } = await import('../lib/auth.js');
  const { default: handler } = await import(`../api/broadcast.js?funnel=${Date.now()}`);
  const response = () => ({ code: 0, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() {} });

  const owner = response();
  await handler({ method: 'POST', headers: { authorization: `Bearer ${createSession('owner@example.com')}` }, body: { action: 'funnelMetrics' } }, owner);
  assert.equal(owner.code, 200);
  assert.equal(owner.body.ok, true);
  assert.equal(owner.body.historical.accounts, 1);
  assert.equal(owner.body.historical.everGenerated, 1);

  const nonOwner = response();
  await handler({ method: 'POST', headers: { authorization: `Bearer ${createSession('user@example.com')}` }, body: { action: 'funnelMetrics' } }, nonOwner);
  assert.equal(nonOwner.code, 403);
});
