import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('app.html');
const plugins = read('plugins.html');
const manager = read('lib/plugin-manager-handler.js');

test('standard Settings stays simple and does not leak owner-only integrations', () => {
  assert.match(app, /function renderSettingsPanel\(\)/);
  assert.match(app, /Plan, credits and billing\./);
  assert.match(app, /data-action="open-credits"/);
  assert.match(app, /data-action="open-plans"/);
  assert.match(app, /data-action="open-models"/);
  assert.doesNotMatch(app, /owner-only/);
  assert.doesNotMatch(app, /href="\/jarvis"/);
});

test('plugin page never flashes private or unconfirmed account integrations', () => {
  assert.match(plugins, /\.plugin\[hidden\]\{display:none!important\}/);
  assert.match(plugins, /data-plugin="gmail" data-requires-account="true" hidden/);
  assert.match(plugins, /data-plugin="github" data-audience="owner" hidden/);
  assert.match(plugins, /data-plugin="vercel" data-audience="owner" hidden/);
  assert.match(plugins, /data-status="coming_soon" hidden/);
  assert.match(plugins, /owner=data\?\.viewer\?\.owner===true/);
  assert.match(plugins, /card\.hidden=!ids\.has\(id\)/);
});

test('normal plugin API responses hide owner, future and provider setup details', () => {
  assert.match(manager, /if\(plugin\.audience==='owner'\|\|plugin\.status==='coming_soon'\)return false/);
  assert.match(manager, /viewer:\{signedIn:true,owner:isOwner===true\}/);
  assert.match(manager, /function publicOauthStatus/);
  assert.match(manager, /tokenFallback:isOwner===true&&status\.tokenFallback===true/);
  assert.match(manager, /This connection is not available yet/);
});
