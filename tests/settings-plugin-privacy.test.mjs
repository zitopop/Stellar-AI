import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('app.html');
const plugins = read('plugins.html');
const manager = read('lib/plugin-manager-handler.js');

test('standard Settings is simple while owner tools are conditionally rendered from server truth', () => {
  assert.match(app, /Plan, credits and billing\./);
  assert.match(app, /href="\/plugins"/);
  assert.match(app, /href="\/legal"/);
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
  assert.match(app, /serverOwner=data\.owner===true\|\|account\.owner===true/);
  assert.doesNotMatch(app, /email==='tobi@trystellarai\.com'/);
});

test('plugin page does not statically expose private account integrations', () => {
  assert.match(plugins, /\[hidden\]\{display:none!important\}/);
  assert.match(plugins, /id="plugin-account-grid"/);
  assert.match(plugins, /pluginApi\('list'\)/);
  assert.match(plugins, /renderConnectedApps/);
  assert.match(plugins, /data\.plugins/);
  assert.doesNotMatch(plugins, /data-plugin="github"/);
  assert.doesNotMatch(plugins, /data-plugin="vercel"/);
  assert.match(plugins, /Owner-only integrations are never offered to standard accounts/);
});

test('normal plugin API responses hide owner, future and provider setup details', () => {
  assert.match(manager, /if\(isOwner\)return true/);
  assert.match(manager, /if\(plugin\.audience==='owner'\|\|plugin\.status==='coming_soon'\)return false/);
  assert.match(manager, /viewer:\{signedIn:true,owner:isOwner===true\}/);
  assert.match(manager, /function publicOauthStatus/);
  assert.match(manager, /tokenFallback:isOwner===true&&status\.tokenFallback===true/);
  assert.match(manager, /This connection is not available yet/);
});
