import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const start = app.indexOf("const SESSION_BACKUP_KEY='stellar-store-session-fallback';");
const end = app.indexOf('function metric(', start);
assert.ok(start >= 0 && end > start, 'session storage helpers are present');
const sessionHelpers = new Script(app.slice(start, end), { filename: 'stellar-session-storage.js' });

function harness({ persistent = new Map(), tab = new Map(), storageFull = false, tabBlocked = false } = {}) {
  const context = {
    STORE: 'stellar-store',
    volatileStore: {},
    volatileStoreOverride: false,
    safeStorageGet: (key, fallback = '') => persistent.has(key) ? persistent.get(key) : fallback,
    safeStorageSet: (key, value) => {
      if (storageFull) return false;
      persistent.set(key, value);
      return true;
    },
    safeStorageRemove: key => persistent.delete(key),
    sessionStorage: {
      getItem: key => { if (tabBlocked) throw new Error('unavailable'); return tab.get(key) ?? null; },
      setItem: (key, value) => { if (tabBlocked) throw new Error('unavailable'); tab.set(key, value); },
      removeItem: key => { if (tabBlocked) throw new Error('unavailable'); tab.delete(key); },
    },
  };
  createContext(context);
  sessionHelpers.runInContext(context);
  return { context, persistent, tab };
}

test('quota failure cannot replace fresh sign-in with old localStorage session on first chat', () => {
  const persistent = new Map([['stellar-store', JSON.stringify({ session: 'stale-token', user: { email: 'old@example.test' } })]]);
  const tab = new Map();
  const { context } = harness({ persistent, tab, storageFull: true });
  context.setSession('fresh-token', { email: 'new@example.test' });
  assert.equal(context.token(), 'fresh-token');
  assert.equal(context.authHeaders().Authorization, 'Bearer fresh-token');
  assert.equal(JSON.parse(persistent.get('stellar-store')).session, 'stale-token');
  assert.equal(JSON.parse(tab.get('stellar-store-session-fallback')).session, 'fresh-token');
  const reloaded = harness({ persistent, tab, storageFull: true }).context;
  assert.equal(reloaded.token(), 'fresh-token', 'same-tab reload must use the newer session fallback');
});

test('sign-out clears stale persistent login even when storage is full', () => {
  const persistent = new Map([['stellar-store', JSON.stringify({ session: 'stale-token' })]]);
  const tab = new Map();
  const { context } = harness({ persistent, tab, storageFull: true });
  context.setSession('current-token', { email: 'member@example.test' });
  context.clearSession();
  assert.equal(context.token(), '');
  assert.equal(context.authHeaders().Authorization, undefined);
  assert.equal(persistent.has('stellar-store'), false);
  assert.equal(tab.has('stellar-store-session-fallback'), false);
  assert.equal(harness({ persistent, tab, storageFull: true }).context.token(), '');
});

test('successful writes update durable session and remove stale same-tab fallback', () => {
  const persistent = new Map();
  const tab = new Map([['stellar-store-session-fallback', JSON.stringify({ session: 'old-token' })]]);
  const { context } = harness({ persistent, tab });
  context.setSession('new-token', { email: 'member@example.test' });
  assert.equal(context.token(), 'new-token');
  assert.equal(JSON.parse(persistent.get('stellar-store')).session, 'new-token');
  assert.equal(tab.has('stellar-store-session-fallback'), false);
  assert.equal(harness({ persistent, tab }).context.token(), 'new-token');
});

test('blocked browser storage still permits an in-memory signed-in chat', () => {
  const { context } = harness({ storageFull: true, tabBlocked: true });
  context.setSession('memory-token', { email: 'member@example.test' });
  assert.equal(context.token(), 'memory-token');
  assert.equal(context.authHeaders().Authorization, 'Bearer memory-token');
});
