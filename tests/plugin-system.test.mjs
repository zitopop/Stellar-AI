import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PLUGIN_REGISTRY, PLUGIN_SCHEMA_VERSION, getPluginDefinition } from '../lib/plugin-registry.js';

const api = await readFile(new URL('../api/desktop-agent.js', import.meta.url), 'utf8');
const manager = await readFile(new URL('../lib/plugin-manager-handler.js', import.meta.url), 'utf8');
const desktop = await readFile(new URL('../lib/desktop-agent-handler.js', import.meta.url), 'utf8');
const studio = await readFile(new URL('../lib/roblox-studio-agent-handler.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../plugins.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('plugin registry is manifest-driven and separates available from future integrations', () => {
  assert.equal(PLUGIN_SCHEMA_VERSION, '1');
  for (const id of ['pc-agent','roblox-studio','github','vercel','gmail','google-drive','google-calendar','discord','shopify','stripe']) {
    assert.ok(getPluginDefinition(id), id);
  }
  assert.equal(getPluginDefinition('pc-agent').status, 'beta');
  assert.equal(getPluginDefinition('roblox-studio').audience, 'owner');
  assert.equal(getPluginDefinition('github').status, 'coming_soon');
  assert.equal(getPluginDefinition('gmail').defaultEnabled, false);
  assert.ok(PLUGIN_REGISTRY.every(plugin => Array.isArray(plugin.permissions) && plugin.permissions.length > 0));
});

test('plugin manager is account-scoped and blocks unavailable integrations from being enabled', () => {
  assert.match(manager, /requireSession\(req,res\)/);
  assert.match(manager, /action==='setEnabled'/);
  assert.match(manager, /plugin\.status==='coming_soon'/);
  assert.match(manager, /That plugin is coming soon/);
  assert.match(manager, /typeof req\.body\?\.enabled!=='boolean'/);
});

test('shared API keeps plugin management within the existing serverless function budget', () => {
  assert.match(api, /surface==='plugins'/);
  assert.match(api, /pluginManagerHandler/);
  assert.ok(vercel.rewrites.some(route => route.source === '/api/plugins' && route.destination === '/api/desktop-agent?surface=plugins'));
  assert.ok(vercel.rewrites.some(route => route.source === '/plugins' && route.destination === '/plugins.html'));
  assert.ok(vercel.headers.some(route => route.source === '/plugins' && route.headers?.some(h => h.key === 'Cache-Control' && h.value === 'private, no-store')));
});

test('disabling built-in plugins actually stops their task bridges', () => {
  assert.match(desktop, /isPluginEnabled\(a\.device\.email,'pc-agent'\)/);
  assert.match(desktop, /PC Agent is disabled in Plugins/);
  assert.match(studio, /isPluginEnabled\(a\.device\.email,'roblox-studio'\)/);
  assert.match(studio, /Roblox Studio plugin is disabled in Plugins/);
});

test('plugin UI exposes permissions without pretending future OAuth connections exist', () => {
  assert.match(page, /PLUGIN DIRECTORY/);
  assert.match(page, /Permission-first by design/);
  assert.match(page, /OAuth not connected yet/);
  assert.match(page, /data-toggle=/);
  assert.match(page, /\/api\/plugins/);
  assert.match(app, /data-tab="plugins"/);
  assert.match(app, /href="\/plugins" class="set-item set-click"/);
  assert.match(app, /onclick="location\.href='\/plugins'"/);
});
