import test from 'node:test';
import assert from 'node:assert/strict';

// This suite intentionally never calls a model provider, KV or Stripe.
const previousProviderKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = 'test-provider-key-not-used';
const { default: chatHandler } = await import('../api/chat.js?session-boundary-regression=1');
if (previousProviderKey === undefined) delete process.env.ANTHROPIC_API_KEY;
else process.env.ANTHROPIC_API_KEY = previousProviderKey;

function makeRes() {
  return {
    statusCode: 200, body: null, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test('invalid Bearer session is rejected before usage is charged', async () => {
  const req = {
    method: 'POST',
    query: {},
    headers: {
      origin: 'https://trystellarai.com',
      authorization: 'Bearer untrusted.expired.session',
    },
    body: { model: 'auto', role: 'general', messages: [{ role: 'user', content: 'Hello' }] },
  };
  const res = makeRes();
  await chatHandler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'SESSION_REAUTH_REQUIRED');
  assert.doesNotMatch(JSON.stringify(res.body), /provider|secret|token value/i);
});
