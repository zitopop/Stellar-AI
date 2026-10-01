import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('landing pricing preserves paid plan intent when opening workspace', () => {
  for (const plan of ['starter', 'plus', 'pro']) assert.ok(landing.includes(`href="/app?upgrade=${plan}"`));
});

test('workspace persists upgrade intent through sign-in and starts authenticated Stripe checkout', () => {
  assert.match(app, /const UPGRADE_PLANS=new Set\(\['starter','plus','pro','starter-annual','plus-annual','pro-annual'\]\)/);
  assert.match(app, /stellar-pending-upgrade/);
  assert.match(app, /function pendingUpgrade\(v=''\)/);
  assert.match(app, /async function handlePendingIntents\(\)/);
  assert.match(app, /async function startPlanCheckout\(plan\)/);
  assert.match(app, /fetch\('\/api\/create-checkout'/);
  assert.match(app, /body:JSON\.stringify\(\{plan\}\)/);
  assert.match(app, /u\.hostname!=='checkout\.stripe\.com'/);
});

test('Google and email sign-in resume a saved plan intent; Discord keeps browser session storage intact', () => {
  assert.match(app, /handleGoogleCredential\(response\)[\s\S]*?await handlePendingIntents\(\)/);
  assert.match(app, /async function emailAuth\(mode\)[\s\S]*?await handlePendingIntents\(\)/);
  assert.match(app, /discordHref='\/api\/discord-oauth'/);
  assert.match(app, /consumeDiscordOAuthReturn/);
  assert.match(app, /sessionStorage\.setItem\('stellar-pending-upgrade',p\)/);
});
