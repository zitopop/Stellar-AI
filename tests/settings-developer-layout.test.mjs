import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../lib/assets/stellar-settings-developer-v42.css', import.meta.url), 'utf8');
const getPlan = fs.readFileSync(new URL('../api/get-plan.js', import.meta.url), 'utf8');
const oauth = fs.readFileSync(new URL('../api/discord-oauth.js', import.meta.url), 'utf8');
const apiKeys = fs.readFileSync(new URL('../lib/api-keys.js', import.meta.url), 'utf8');

test('Settings uses the requested three-tab developer layout', () => {
  for (const label of ['General &amp; Stack','Discord &amp; API Keys','Subscription &amp; Billing']) assert.match(app, new RegExp(label));
  assert.match(css, /width:min\(820px,calc\(100vw - 32px\)\)/);
  assert.match(css, /grid-template-columns:178px minmax\(0,1fr\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /background:[\s\S]*#090a0f!important/);
  assert.match(css, /@media\(max-width:700px\)[\s\S]*settings-dev-nav-tabs[\s\S]*overflow-x:auto/);
});

test('stack preferences are real controls and feed relevant game-development prompts', () => {
  for (const stack of ['QBCore','ESX','ox_lib','Roblox Luau']) assert.match(app, new RegExp(stack));
  assert.match(app, /Auto-inject Anti-Exploit Checks/);
  assert.match(app, /Generate fxmanifest automatically/);
  assert.match(app, /stellar-developer-settings-v1/);
  assert.match(app, /developerPreferenceInstruction/);
  assert.match(app, /server-authoritative anti-exploit validation/);
});

test('Discord profile and customer API key management remain server-owned', () => {
  assert.match(oauth, /discordAvatar/);
  assert.match(getPlan, /discord: discordProfile\(authRecord\)/);
  assert.match(app, /Copy API Key/);
  assert.match(app, /Regenerate Key/);
  assert.match(apiKeys, /crypto\.randomBytes\(24\)/);
  assert.match(apiKeys, /timingSafeEqual/);
  assert.match(apiKeys, /scope: 'integrations'/);
  assert.doesNotMatch(apiKeys, /pointer.*key\s*:/);
});

test('billing pane shows live usage and a Plus or subscription CTA', () => {
  assert.match(app, /settings-usage-track/);
  assert.match(app, /credits remaining/);
  assert.match(app, /Upgrade to Plus \(£20\/mo\)/);
  assert.match(app, /Manage Subscription/);
  assert.match(css, /linear-gradient\(135deg,#8a2be2 0%,#6946e8 48%,#00cde7 100%\)/);
});


test('Settings stays compact on phone without shrinking touch targets', () => {
  assert.match(css, /@media\(max-width:700px\)[\s\S]*max-height:86dvh/);
  assert.match(css, /settings-dev-tab\{flex:0 0 auto;width:auto;min-height:44px/);
  assert.match(css, /settings-dev-content\{padding:11px 12px/);
});
