import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('startup refreshes a saved session before loading plan truth', () => {
  assert.match(app, /async function init\(\)\{signedInUser=store\(\)\.user\|\|null;if\(token\(\)\)await refreshSession\(\);await loadPlanTruth\(\)/);
});

test('failed session refresh falls back safely to signed-out state', () => {
  assert.match(app, /if\(res\.status===401\)\{clearSession\(\);signedInUser=null;return false\}/);
  assert.match(app, /catch\{\}return false/);
});

test('app renders local chats and plan baseline during simple startup', () => {
  assert.match(app, /await loadPlanTruth\(\);loadSessions\(\)/);
  assert.match(app, /await handlePendingIntents\(\)/);
  assert.match(app, /setStatus\('Ready','good'\);prompt\.focus\(\)/);
});
