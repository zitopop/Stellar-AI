import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const start = app.indexOf('async function refreshSession(){');
const end = app.indexOf('async function ownerRequest(', start);
assert.ok(start >= 0 && end > start, 'Session and plan refresh functions must exist');
const script = new vm.Script(app.slice(start, end));

function response(status, body = {}) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}
function harness({ plan = [], auth = [] } = {}) {
  const requests = [];
  const warnings = [];
  const state = {
    currentToken: 'saved-login-token',
    signedInUser: { email: 'tester@example.invalid' },
    serverOwner: true,
    serverStaff: true,
    allowedModels: ['spark', 'nova'],
    planState: { plan: 'owner' },
    COSTS: { spark: 2 },
    referralUrl: '',
    token: () => state.currentToken,
    store: () => ({ user: state.signedInUser }),
    clearSession: () => { state.currentToken = ''; },
    setSession: (value, user) => { state.currentToken = value; state.signedInUser = user; },
    authHeaders: () => ({ Authorization: 'Bearer ' + state.currentToken }),
    safeModel: value => value,
    setStatus: (message, tone) => warnings.push({ message, tone }),
    updateHeader: () => {},
    setTimeout: fn => { fn(); return 1; },
    fetch: async (url) => {
      requests.push(url);
      if (url === '/api/auth') {
        assert.ok(auth.length > 0, 'Unexpected session refresh');
        return auth.shift();
      }
      assert.equal(url, '/api/get-plan');
      assert.ok(plan.length > 0, 'Unexpected plan request');
      return plan.shift();
    },
  };
  vm.createContext(state);
  script.runInContext(state);
  return { state, requests, warnings };
}

test('background plan verification 401 does not erase account session after a chat', async () => {
  const h = harness({ plan: [response(401)] });
  await h.state.loadPlanTruth({ passive: true });
  assert.deepEqual(h.requests, ['/api/get-plan']);
  assert.equal(h.state.currentToken, 'saved-login-token');
  assert.equal(h.state.signedInUser.email, 'tester@example.invalid');
  assert.equal(h.state.serverOwner, false);
  assert.equal(h.state.serverStaff, false);
  assert.deepEqual([...h.state.allowedModels], ['spark']);
  assert.match(h.warnings.at(-1).message, /Could not verify your plan/);
});

test('an actual expired token still clears the session during explicit verification', async () => {
  const h = harness({ plan: [response(401)], auth: [response(401), response(401)] });
  await h.state.loadPlanTruth();
  assert.deepEqual(h.requests, ['/api/get-plan', '/api/auth', '/api/auth']);
  assert.equal(h.state.currentToken, '');
  assert.equal(h.state.signedInUser, null);
  assert.equal(h.state.planState.plan, 'free');
});

test('successful passive refresh keeps verified paid entitlements', async () => {
  const h = harness({ plan: [response(200, { plan: 'plus', availableModels: ['spark', 'star', 'comet'], capabilities: { name: 'Plus' } })] });
  await h.state.loadPlanTruth({ passive: true });
  assert.equal(h.state.currentToken, 'saved-login-token');
  assert.equal(h.state.planState.plan, 'plus');
  assert.deepEqual([...h.state.allowedModels], ['spark', 'star', 'comet']);
});

test('transient plan service outages keep saved accounts and show recoverable status', async () => {
  const h = harness({ plan: [response(503, { error: 'Service temporarily unavailable' })] });
  await h.state.loadPlanTruth({ passive: true });
  assert.equal(h.state.currentToken, 'saved-login-token');
  assert.ok(h.state.signedInUser);
  assert.match(h.warnings.at(-1).message, /Service temporarily unavailable/);
});

test('automatic chat refresh is passive and manual sign-out still clears session', () => {
  assert.match(app, /if\(token\(\)\)loadPlanTruth\(\{passive:true\}\)/);
  assert.match(app, /else if\(a==='signout'\)\{[^}]*clearSession\(\)/);
});
