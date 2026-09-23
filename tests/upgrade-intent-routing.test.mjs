import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('landing pricing preserves paid plan intent when opening workspace', () => {
  for (const plan of ['starter', 'plus', 'pro']) {
    assert.ok(landing.includes(`href="/app?upgrade=${plan}"`));
  }
});

test('workspace persists upgrade intent through sign-in and starts authenticated Stripe checkout', () => {
  assert.match(app, /const UPGRADE_PLANS=new Set\(\['starter','plus','pro','starter-annual','plus-annual','pro-annual'\]\)/);
  assert.match(app, /stellar-pending-upgrade/);
  assert.match(app, /async function handleUpgradeIntent\(\)/);
  assert.match(app, /async function startPlanCheckout\(plan\)/);
  assert.match(app, /fetch\('\/api\/create-checkout'/);
  assert.match(app, /body:JSON\.stringify\(\{plan:normalized\}\)/);
  assert.match(app, /checkoutUrl\.hostname!=='checkout\.stripe\.com'/);
});

test('email Google and Discord sign-in preserve or resume the requested plan', () => {
  assert.match(app, /handleGoogleSignIn[\s\S]*?await handleUpgradeIntent\(\)/);
  assert.match(app, /async function emailAuth\(mode\)[\s\S]*?await handleUpgradeIntent\(\)/);
  assert.match(app, /id="discord-signin-btn"[^>]*onclick="pendingUpgradeIntent\(\)"/);
});
