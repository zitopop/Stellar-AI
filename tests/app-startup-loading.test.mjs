import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('startup consumes OAuth returns before refreshing the session and loading server plan truth', () => {
  assert.match(app, /async function init\(\)\{initImageInput\(\);initVoiceInput\(\);syncConnectivity\(\);consumeAuthError\(\);consumeDiscordOAuthReturn\(\);signedInUser=store\(\)\.user\|\|signedInUser\|\|null;if\(token\(\)\)await refreshSession\(\);await loadPlanTruth\(\);await handlePaymentReturn\(\)/);
});

test('failed session refresh falls back safely to signed-out state', () => {
  assert.match(app, /if\(res\.status===401\)\{clearSession\(\);signedInUser=null;return false\}/);
  assert.match(app, /catch\{\}return false/);
});

test('app renders local chats and handles pending checkout intent during startup', () => {
  assert.match(app, /await handlePaymentReturn\(\);loadSessions\(\)/);
  assert.match(app, /applyJarvisEntry\(\);await handlePendingIntents\(\)/);
  assert.match(app, /if\(!String\(statusEl\.textContent\|\|''\)\.includes\('Discord'\)\)setStatus\('Ready','good'\);prompt\.focus\(\)/);
});
