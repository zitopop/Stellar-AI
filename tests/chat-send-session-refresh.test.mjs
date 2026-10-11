import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const start = app.indexOf('async function requestChatWithSessionRefresh(');
const end = app.indexOf('async function sendMessage(', start);
assert.ok(start >= 0 && end > start, 'chat request helper must precede sendMessage');
const helper = app.slice(start, end);

function harness(statuses, { signedIn = true, canRefresh = true, aborted = false } = {}) {
  const calls = [];
  const responses = statuses.map(status => ({ status }));
  let currentToken = signedIn ? 'old-session' : '';
  let refreshed = 0;
  const context = {
    token: () => currentToken,
    authHeaders: () => ({ Authorization: 'Bearer ' + currentToken }),
    refreshSession: async () => {
      refreshed += 1;
      if (canRefresh) currentToken = 'new-session';
      return canRefresh;
    },
    fetch: async (url, options) => {
      calls.push({ url, method: options.method, token: options.headers.Authorization, body: options.body, signal: options.signal });
      assert.ok(responses.length, 'unexpected duplicate generation');
      return responses.shift();
    }
  };
  runInNewContext(helper, context, { timeout: 1000 });
  return {
    send: (payload = { messages: [{ role: 'user', content: 'Hello' }] }) =>
      context.requestChatWithSessionRefresh(payload, { signal: { aborted } }),
    calls,
    refreshCount: () => refreshed,
  };
}

test('a valid chat request is sent once without session refresh', async () => {
  const h = harness([200]);
  assert.equal((await h.send()).status, 200);
  assert.equal(h.calls.length, 1);
  assert.equal(h.refreshCount(), 0);
});

test('expired auth refreshes once and retries with the same chat and new token', async () => {
  const h = harness([401, 200]);
  assert.equal((await h.send()).status, 200);
  assert.equal(h.calls.length, 2);
  assert.equal(h.refreshCount(), 1);
  assert.deepEqual(h.calls.map(call => call.token), ['Bearer old-session', 'Bearer new-session']);
  assert.equal(h.calls[0].body, h.calls[1].body);
  assert.equal(h.calls[0].signal, h.calls[1].signal);
  assert.ok(h.calls.every(call => call.url === '/api/chat' && call.method === 'POST'));
});

test('invalid or absent sessions do not endlessly retry generation', async () => {
  for (const options of [{ canRefresh: false }, { signedIn: false }, { aborted: true }]) {
    const h = harness([401], options);
    assert.equal((await h.send()).status, 401);
    assert.equal(h.calls.length, 1);
    assert.equal(h.refreshCount(), options.signedIn === false || options.aborted === true ? 0 : 1);
  }
});

test('rate limits and upstream failures never trigger another billable generation', async () => {
  for (const status of [402, 429, 500, 503, 504]) {
    const h = harness([status]);
    assert.equal((await h.send()).status, status);
    assert.equal(h.calls.length, 1);
    assert.equal(h.refreshCount(), 0);
  }
});

test('the visible send path uses the abortable session-refresh helper', () => {
  const sendSource = app.slice(end, app.indexOf('let planBillingView=', end));
  assert.match(sendSource, /await requestChatWithSessionRefresh\(\{action:'chat'/);
  assert.match(sendSource, /signal:currentGenerationController\.signal/);
  assert.match(helper, /response\.status!==401/);
  assert.match(helper, /token\(\)!==initialToken/);
});
