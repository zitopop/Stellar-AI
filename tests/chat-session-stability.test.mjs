import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, Script } from 'node:vm';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const from = app.indexOf('async function refreshSession()');
const to = app.indexOf('async function ownerRequest(', from);
assert.ok(from >= 0 && to > from, 'session and plan functions must remain identifiable');

const script = new Script(app.slice(from, to), { filename: 'stellar-session-functions.js' });

function response(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function harness({ planResponses = [], authResponses = [], onFetch } = {}) {
  const calls = [];
  const notices = [];
  const state = {
    currentToken: 'original-token',
    signedInUser: { email: 'member@example.test' },
    serverOwner: false,
    serverStaff: false,
    allowedModels: ['spark'],
    planState: { plan: 'previous' },
    COSTS: { spark: 2 },
    referralUrl: '',
    token: () => state.currentToken,
    clearSession: () => { state.currentToken = ''; },
    setSession: (value, user) => { state.currentToken = value; state.signedInUser = user; },
    store: () => ({ user: state.signedInUser }),
    authHeaders: (json = true) => ({
      ...(json ? { 'content-type': 'application/json' } : {}),
      ...(state.currentToken ? { Authorization: 'Bearer ' + state.currentToken } : {}),
    }),
    safeModel: value => value,
    updateHeader: () => {},
    setStatus: (message, tone) => notices.push({ message, tone }),
    setTimeout: callback => callback(), // Fast-forward the one-time transient-401 retry.
    fetch: async (url, options) => {
      calls.push({ url, auth: options?.headers?.Authorization || '' });
      onFetch?.(url, state);
      if (url === '/api/auth') {
        assert.ok(authResponses.length, 'unexpected session refresh');
        return authResponses.shift();
      }
      assert.equal(url, '/api/get-plan');
      assert.ok(planResponses.length, 'unexpected plan request');
      return planResponses.shift();
    },
  };
  createContext(state);
  script.runInContext(state);
  return { state, calls, notices };
}

test('a recoverable plan 401 refreshes and retries without signing out after chat', async () => {
  const { state, calls } = harness({
    planResponses: [response(401), response(200, { plan: 'free', availableModels: ['spark'] })],
    authResponses: [response(200, { session: 'refreshed-token', user: { email: 'member@example.test' } })],
  });
  await state.loadPlanTruth();
  assert.equal(state.currentToken, 'refreshed-token');
  assert.equal(state.signedInUser.email, 'member@example.test');
  assert.equal(state.planState.plan, 'free');
  assert.deepEqual(calls.map(call => call.url), ['/api/get-plan', '/api/auth', '/api/get-plan']);
  assert.equal(calls[2].auth, 'Bearer refreshed-token');
});

test('a plan-only 401 cannot sign out an auth-verified user', async () => {
  const { state, notices } = harness({
    planResponses: [response(401), response(401, { error: 'Plan permission denied.' })],
    authResponses: [response(200, { session: 'still-valid-token', user: { email: 'member@example.test' } })],
  });
  await state.loadPlanTruth();
  assert.equal(state.currentToken, 'still-valid-token');
  assert.ok(state.signedInUser);
  assert.match(notices.at(-1)?.message || '', /Plan permission denied/);
});

test('only a confirmed 401 from the session endpoint signs out an expired login', async () => {
  const { state } = harness({
    planResponses: [response(401)],
    authResponses: [response(401, { error: 'Please sign in again.' }), response(401, { error: 'Please sign in again.' })],
  });
  await state.loadPlanTruth();
  assert.equal(state.currentToken, '');
  assert.equal(state.signedInUser, null);
  assert.equal(state.planState.plan, 'free');
});

test('temporary session-service errors do not wipe the saved login', async () => {
  const { state, notices } = harness({
    planResponses: [response(401)],
    authResponses: [response(503, { error: 'Service unavailable.' })],
  });
  await state.loadPlanTruth();
  assert.equal(state.currentToken, 'original-token');
  assert.ok(state.signedInUser);
  assert.match(notices.at(-1)?.message || '', /Could not verify your session/);
});

test('an old plan response cannot sign out a newly signed-in account', async () => {
  const { state, calls } = harness({
    planResponses: [response(401)],
    onFetch: (url, current) => {
      if (url === '/api/get-plan') {
        current.currentToken = 'new-account-token';
        current.signedInUser = { email: 'other@example.test' };
      }
    },
  });
  await state.loadPlanTruth();
  assert.equal(state.currentToken, 'new-account-token');
  assert.equal(state.signedInUser.email, 'other@example.test');
  assert.equal(calls.length, 1);
});
