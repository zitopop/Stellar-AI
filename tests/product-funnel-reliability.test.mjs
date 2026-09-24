import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Google identity is loaded only when sign-in is opened', () => {
  assert.doesNotMatch(app, /<script src="https:\/\/accounts\.google\.com\/gsi\/client"/);
  assert.match(app, /function loadGoogleIdentityScript\(\)/);
  assert.match(app, /script\.src='https:\/\/accounts\.google\.com\/gsi\/client'/);
  assert.match(app, /if\\\(!signedInUser\\\)void initGoogleSignIn\\\(\\\)/);
  assert.doesNotMatch(app, /updateCreditUi\(\);initGoogleSignIn\(\);/);
});

test('chat rename uses an accessible in-app dialog and persists custom names', () => {
  assert.match(app, /id="rename-modal" role="dialog" aria-modal="true"/);
  assert.match(app, /id="rename-chat-input"/);
  assert.match(app, /function commitRenameChat\(\)/);
  assert.doesNotMatch(app, /\bprompt\s*\(/);
  assert.match(app, /existing\?\.title\|\|messages\.find/);
});

test('subscription return waits for the purchased plan instead of claiming instant sync', () => {
  assert.match(app, /const expectedPlan=purchasedPlan\.replace\(\/-annual\$\//);
  assert.match(app, /normalizedPlan\(\)===expectedPlan/);
  assert.match(app, /Your plan is still syncing\. Refresh shortly or use Support if it does not update\./);
});

test('plan checkout prevents duplicate opening from repeated taps', () => {
  assert.match(app, /let checkoutOpening=false/);
  assert.match(app, /if\(checkoutOpening\)/);
  assert.match(app, /document\.querySelectorAll\('#settings-plan-actions button'\).*disabled=true/);
  assert.match(app, /checkoutOpening=false/);
});

test('first sign-in onboarding stays compact instead of adding quick-start clutter', () => {
  assert.match(app, /stellar-first-signin-onboarding-v2/);
  assert.match(app, /Ask about a task, workflow or build/);
  assert.doesNotMatch(app, /showFirstSignInOnboarding[\s\S]{0,700}insertAdjacentHTML/);
});
