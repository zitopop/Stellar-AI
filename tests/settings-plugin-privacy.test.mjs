import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const app = read('app.html');
const plugins = read('plugins.html');
const manager = read('lib/plugin-manager-handler.js');

test('standard Settings stays simple while owner controls remain private', () => {
  const settings = app.match(/<section id="settings-panel"[\s\S]*?<div id="model-menu"/)?.[0] || '';
  assert.match(settings, /Manage your account, plan and connected tools\./);
  assert.doesNotMatch(settings, /Manage your account, plan, connected tools and owner controls/);
  assert.match(settings, /<a href="\/plugins" class="settings-row">/);
  assert.match(settings, /Only connections available to your account/);
  assert.match(settings, /id="topup-row"[^>]*hidden/);
  assert.match(settings, /<strong>Legal &amp; privacy<\/strong>/);
  assert.equal((settings.match(/href="\/legal"/g) || []).length, 1);
  assert.equal((settings.match(/href="\/(?:terms|privacy)"/g) || []).length, 0);
  assert.match(settings, /settings-advanced-toggle owner-only" hidden/);
  assert.match(settings, /href="\/jarvis"[^>]*owner-only|owner-only"[^>]*href="\/jarvis"/);
});

test('plugin page never flashes private or unconfirmed account integrations', () => {
  assert.match(plugins, /\.plugin\[hidden\]\{display:none!important\}/);
  assert.match(plugins, /data-plugin="gmail" data-requires-account="true" hidden/);
  assert.match(plugins, /data-plugin="github" data-audience="owner" hidden/);
  assert.match(plugins, /data-plugin="vercel" data-audience="owner" hidden/);
  assert.match(plugins, /data-status="coming_soon" hidden/);
  assert.match(plugins, /owner=data\?\.viewer\?\.owner===true/);
  assert.match(plugins, /card\.hidden=!ids\.has\(id\)/);
  assert.doesNotMatch(plugins, /OWNER-ONLY OAUTH MODAL POLISH|setupText/);
});

test('normal plugin API responses hide owner, future and provider setup details', () => {
  assert.match(manager, /if\(plugin\.audience==='owner'\|\|plugin\.status==='coming_soon'\)return false/);
  assert.match(manager, /viewer:\{signedIn:true,owner:isOwner===true\}/);
  assert.match(manager, /function publicOauthStatus/);
  assert.match(manager, /\.\.\.\(exposeSetup\?\{/);
  assert.match(manager, /tokenFallback:isOwner===true&&status\.tokenFallback===true/);
  assert.match(manager, /This connection is not available yet/);
});
