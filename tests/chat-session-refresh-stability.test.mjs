import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const start = app.indexOf('async function refreshSession(){');
const end = app.indexOf('async function loadPlanTruth(){', start);
assert.ok(start >= 0 && end > start, 'App session refresh function must be present');
const refreshSource = app.slice(start, end);

function makeHarness(responses) {
  let session = 'current-signed-token';
  let clearCount = 0;
  let callCount = 0;
  let headerCount = 0;
  const sandbox = {
    signedInUser: { email: 'test@example.invalid' },
    serverOwner: true,
    serverStaff: true,
    token: () => session,
    store: () => ({ user: sandbox.signedInUser }),
    setSession: (value, user) => { session = value; sandbox.signedInUser = user; },
    clearSession: () => { clearCount++; session = ''; sandbox.signedInUser = null; },
    updateHeader: () => { headerCount++; },
    fetch: async () => {
      const response = responses[Math.min(callCount, responses.length - 1)];
      callCount++;
      if (response instanceof Error) throw response;
      return { status: response.status, ok: response.status === 200, json: async () => response.body || {} };
    },
    setTimeout: (fn) => { fn(); return 1; },
    Promise,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(refreshSource, context);
  return {
    sandbox,
    refresh: () => vm.runInContext('refreshSession()', context),
    state: () => ({ session, clearCount, callCount, headerCount }),
  };
}

test('a double 401 from background verification preserves user session and revokes private UI', async () => {
  const h = makeHarness([{ status: 401 }, { status: 401 }]);
  assert.equal(await h.refresh(), false);
  assert.equal(h.state().callCount, 2);
  assert.equal(h.state().clearCount, 0);
  assert.equal(h.state().session, 'current-signed-token');
  assert.equal(h.sandbox.signedInUser.email, 'test@example.invalid');
  assert.equal(h.sandbox.serverOwner, false);
  assert.equal(h.sandbox.serverStaff, false);
  assert.equal(h.state().headerCount, 1);
});

test('a valid refresh continues replacing the session and preserving account identity', async () => {
  const h = makeHarness([{ status: 200, body: {
    session: 'rotated-signed-token',
    user: { email: 'test@example.invalid', name: 'Tester' },
  } }]);
  assert.equal(await h.refresh(), true);
  assert.equal(h.state().callCount, 1);
  assert.equal(h.state().clearCount, 0);
  assert.equal(h.state().session, 'rotated-signed-token');
  assert.equal(h.sandbox.signedInUser.name, 'Tester');
});

test('background verification network failures do not sign out a stored account', async () => {
  const h = makeHarness([new Error('temporary network outage')]);
  assert.equal(await h.refresh(), false);
  assert.equal(h.state().clearCount, 0);
  assert.equal(h.state().session, 'current-signed-token');
});

test('manual sign out still explicitly clears the session', () => {
  assert.match(app, /else if\(a==='signout'\)\{[^}]*clearSession\(\)/);
  assert.match(app, /Could not verify your session\. Try again shortly\./);
});
