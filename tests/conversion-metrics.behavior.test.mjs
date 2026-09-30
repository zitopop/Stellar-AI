import test from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalKvUrl = process.env.KV_REST_API_URL;
const originalKvToken = process.env.KV_REST_API_TOKEN;
const originalAuthSecret = process.env.AUTH_SESSION_SECRET;
const originalOwnerEmails = process.env.OWNER_EMAILS;

function response({ ok = true, result = null } = {}) { return { ok, json: async () => ({ result }) }; }
function restoreEnvironment() {
  globalThis.fetch = originalFetch;
  process.env.KV_REST_API_URL = originalKvUrl;
  process.env.KV_REST_API_TOKEN = originalKvToken;
  process.env.AUTH_SESSION_SECRET = originalAuthSecret;
  process.env.OWNER_EMAILS = originalOwnerEmails;
}

test('conversion metric writes and reads use aggregate KV records', async (t) => {
  t.after(restoreEnvironment);
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'token';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (String(options.body).includes('GET')) {
      const values=[7,3,1,2,1,4500,100,60,42,8,5,12,25,2,6,1,3,4,9,11,4,6];
      return { ok: true, json: async () => values.map(result=>({result:String(result)})) };
    }
    return response();
  };
  const metrics = await import(`../lib/conversion-metrics.js?writes=${Date.now()}`);
  assert.equal(await metrics.incrementConversionMetric('checkout-started'), true);
  const summary = await metrics.readConversionMetrics(new Date('2026-08-18T12:00:00.000Z'));
  assert.equal(summary.ok, true);
  assert.deepEqual(summary.metrics, {
    date: '2026-08-18', checkoutStarted: 7, checkoutCompleted: 3, checkoutCancelledOrExpired: 1,
    subscriptionCompleted: 2, topupCompleted: 1, revenuePence: 4500,
    landingViews: 100, appViews: 60, appOpenCtas: 42, upgradeIntents: 8,
    signupSuccess: 5, loginSuccess: 12, firstMessages: 25, chatSendErrors: 2,
    checkoutOpens: 6, checkoutErrors: 1, billingOpens: 3, clientErrors: 4,
    usagePanelOpens: 9, planPanelOpens: 11, usageUpgradeIntents: 4, businessServiceClicks: 6,
  });
  assert.match(String(calls[0].options.body), /checkout-started/);
});

test('a matching checkout attempt records one explicit cancel-return event', async (t) => {
  t.after(restoreEnvironment);
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'token';
  const calls = []; let transitions = 0;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: true, json: async () => [{ result: transitions++ === 0 ? 1 : 0 }] };
  };
  const metrics = await import(`../lib/conversion-metrics.js?cancel=${Date.now()}`);
  assert.equal(await metrics.recordCheckoutCancellation({ id: 'attempt-123', email: 'buyer@example.com' }), true);
  assert.equal(await metrics.recordCheckoutCancellation({ id: 'attempt-123', email: 'buyer@example.com' }), false);
  assert.match(String(calls[0].options.body), /EVAL/);
  assert.match(String(calls[0].options.body), /checkout-cancelled-or-expired/);
});

test('the owner-only metrics action returns aggregate totals and rejects non-owners', async (t) => {
  t.after(restoreEnvironment);
  process.env.KV_REST_API_URL = 'https://kv.test';
  process.env.KV_REST_API_TOKEN = 'token';
  process.env.AUTH_SESSION_SECRET = 'test-secret';
  process.env.OWNER_EMAILS = 'owner@example.com';
  globalThis.fetch = async () => ({ ok: true, json: async () => Array.from({length:22},(_,i)=>({ result: i===5 ? '2000' : '1' })) });

  const { createSession } = await import('../lib/auth.js');
  const { default: handler } = await import(`../api/broadcast.js?owner=${Date.now()}`);
  const makeResponse = () => ({ code: null, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() {} });

  const ownerResponse = makeResponse();
  await handler({ method: 'POST', headers: { authorization: `Bearer ${createSession('owner@example.com')}` }, body: { action: 'conversionMetrics' } }, ownerResponse);
  assert.equal(ownerResponse.code, 200);
  assert.equal(ownerResponse.body.ok, true);
  assert.equal(ownerResponse.body.metrics.revenuePence, 2000);

  const userResponse = makeResponse();
  await handler({ method: 'POST', headers: { authorization: `Bearer ${createSession('user@example.com')}` }, body: { action: 'conversionMetrics' } }, userResponse);
  assert.equal(userResponse.code, 403);
});
