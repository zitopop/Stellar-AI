import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('latest chat layout provides 44px send and model-picker controls', () => {
  const match = app.match(/<style id="stellar-composer-touch-targets-v95">([\s\S]*?)<\/style>/);
  assert.ok(match, 'final accessible composer style exists');
  const css = match[1];
  assert.match(css, /#sendBtn\{[^}]*min-height:44px!important/);
  assert.match(css, /\.composer-layout \.composer-main\{[^}]*44px!important/);
  assert.match(css, /\.composer-layout>\.composer-model-wrap \.composer-model-picker,[\s\S]*?min-height:44px!important/);
  assert.ok(app.indexOf('stellar-composer-touch-targets-v95') > app.indexOf('stellar-model-beside-chatbar-v94'));
});

function isolatedSessionRefresh(responseForCall) {
  const start = app.indexOf('async function refreshSession(){');
  const end = app.indexOf('async function loadPlanTruth(', start);
  assert.ok(start >= 0 && end > start);
  let currentToken = 'session-old';
  let requests = 0;
  let cleared = false;
  const context = {
    token: () => currentToken,
    fetch: async () => responseForCall(++requests),
    setTimeout,
    store: () => ({ user: { email: 'test@example.com' } }),
    setSession: value => { currentToken = value; },
    clearSession: () => { cleared = true; currentToken = ''; },
    signedInUser: { email: 'test@example.com' },
  };
  const refresh = runInNewContext(app.slice(start, end) + '\nrefreshSession', context);
  return { refresh, get requests() { return requests; }, get cleared() { return cleared; }, get token() { return currentToken; } };
}

test('a transient 401 refresh retry does not immediately sign the user out', async () => {
  const session = isolatedSessionRefresh(call => call === 1
    ? { status: 401, ok: false, json: async () => ({}) }
    : { status: 200, ok: true, json: async () => ({ session: 'session-new', user: { email: 'test@example.com' } }) });
  assert.equal(await session.refresh(), true);
  assert.equal(session.requests, 2);
  assert.equal(session.token, 'session-new');
  assert.equal(session.cleared, false);
});

test('persistent invalid sessions remain rejected after one retry', async () => {
  const session = isolatedSessionRefresh(() => ({ status: 401, ok: false, json: async () => ({}) }));
  assert.equal(await session.refresh(), false);
  assert.equal(session.requests, 2);
  assert.equal(session.cleared, true);
});
