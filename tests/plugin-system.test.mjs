import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PLUGIN_REGISTRY, PLUGIN_SCHEMA_VERSION, getPluginDefinition } from '../lib/plugin-registry.js';

const api = await readFile(new URL('../api/desktop-agent.js', import.meta.url), 'utf8');
const manager = await readFile(new URL('../lib/plugin-manager-handler.js', import.meta.url), 'utf8');
const credentials = await readFile(new URL('../lib/plugin-credentials.js', import.meta.url), 'utf8');
const providers = await readFile(new URL('../lib/plugin-providers.js', import.meta.url), 'utf8');
const desktop = await readFile(new URL('../lib/desktop-agent-handler.js', import.meta.url), 'utf8');
const studio = await readFile(new URL('../lib/roblox-studio-agent-handler.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../plugins.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('plugin registry separates working, owner-only and future integrations', () => {
  assert.equal(PLUGIN_SCHEMA_VERSION, '1');
  for (const id of ['pc-agent','roblox-studio','github','vercel','gmail','google-drive','google-calendar','discord','shopify','stripe']) {
    assert.ok(getPluginDefinition(id), id);
  }
  assert.equal(getPluginDefinition('pc-agent').status, 'beta');
  assert.equal(getPluginDefinition('pc-agent').audience, 'signed_in');
  assert.equal(getPluginDefinition('roblox-studio').audience, 'owner');
  assert.equal(getPluginDefinition('github').status, 'available');
  assert.equal(getPluginDefinition('github').audience, 'owner');
  assert.equal(getPluginDefinition('github').connection, 'oauth_or_token');
  assert.equal(getPluginDefinition('github').oauthProvider, 'github');
  assert.equal(getPluginDefinition('vercel').status, 'available');
  assert.equal(getPluginDefinition('vercel').audience, 'owner');
  assert.equal(getPluginDefinition('vercel').connection, 'oauth_or_token');
  assert.equal(getPluginDefinition('vercel').oauthProvider, 'vercel');
  assert.deepEqual(getPluginDefinition('github').permissions.map(p=>p.id), ['repos.read']);
  assert.deepEqual(getPluginDefinition('vercel').permissions.map(p=>p.id), ['deployments.read']);
  assert.equal(getPluginDefinition('gmail').status, 'coming_soon');
  for (const id of ['gmail','google-drive','google-calendar','discord','shopify','stripe']) {
    assert.ok(['oauth','oauth_or_token'].includes(getPluginDefinition(id).connection), id);
    assert.equal(getPluginDefinition(id).setupStatus, 'oauth_setup_needed', id);
    assert.ok(getPluginDefinition(id).setupEnv.length >= 1, id);
  }
  assert.ok(PLUGIN_REGISTRY.every(plugin => Array.isArray(plugin.permissions) && plugin.permissions.length > 0));
});

test('plugin credentials are encrypted at rest and never returned by the manager', () => {
  assert.match(credentials, /aes-256-gcm/);
  assert.match(credentials, /PLUGIN_TOKEN_ENCRYPTION_KEY\|\|process\.env\.AUTH_SESSION_SECRET/);
  assert.match(credentials, /setAuthTag/);
  assert.match(credentials, /credentialKey\(email,id\)/);
  assert.doesNotMatch(manager, /token:\s*token/);
  assert.doesNotMatch(page, /localStorage\.setItem\([^\n]*plugin-token/);
});

test('GitHub and Vercel provider readers verify a token before storing it', () => {
  assert.match(providers, /https:\/\/api\.github\.com/);
  assert.match(providers, /\/user\/repos\?per_page=12/);
  assert.match(providers, /https:\/\/api\.vercel\.com/);
  assert.match(providers, /\/v9\/projects\?limit=12/);
  assert.match(manager, /verifyProviderToken\(id,token\)/);
  assert.match(manager, /storePluginCredential\(session\.email,id,token\)/);
});

test('plugin manager is account-scoped and only enables token plugins after connection', () => {
  assert.match(manager, /requireSession\(req,res\)/);
  assert.match(manager, /action==='install'/);
  assert.match(manager, /action==='startOAuth'/);
  assert.match(manager, /action==='oauthCallback'/);
  assert.match(manager, /github\.com\/login\/oauth\/authorize/);
  assert.match(manager, /github\.com\/login\/oauth\/access_token/);
  assert.match(manager, /action==='connectToken'/);
  assert.match(manager, /action==='disconnect'/);
  assert.match(manager, /action==='inspect'/);
  assert.match(manager, /Connect this plugin before enabling it/);
  assert.match(manager, /plugin\.status==='coming_soon'/);
  assert.ok(manager.includes("visibleRegistry=PLUGIN_REGISTRY.filter(plugin=>isOwner||plugin.audience!=='owner')"));
  assert.match(manager, /exposeSetup=isOwner===true/);
});

test('shared API keeps plugin management within the existing serverless function budget', () => {
  assert.match(api, /surface==='plugins'/);
  assert.match(api, /pluginManagerHandler/);
  assert.ok(vercel.rewrites.some(route => route.source === '/api/plugins' && route.destination === '/api/desktop-agent?surface=plugins'));
  assert.ok(vercel.rewrites.some(route => route.source === '/api/plugin-oauth-callback' && route.destination === '/api/desktop-agent?surface=plugins&action=oauthCallback'));
  assert.ok(vercel.rewrites.some(route => route.source === '/plugins' && route.destination === '/plugins.html'));
  assert.ok(vercel.headers.some(route => route.source === '/plugins' && route.headers?.some(h => h.key === 'Cache-Control' && h.value === 'private, no-store')));
});

test('disabling built-in plugins actually stops their task bridges', () => {
  assert.match(desktop, /isPluginEnabled\(a\.device\.email,'pc-agent'\)/);
  assert.match(desktop, /PC Agent is disabled in Plugins/);
  assert.match(studio, /isPluginEnabled\(a\.device\.email,'roblox-studio'\)/);
  assert.match(studio, /Roblox Studio plugin is disabled in Plugins/);
});

test('premium plugin dashboard exposes real connect manage and disconnect controls', () => {
  assert.ok(page.includes('<h1>Plugins, made easy</h1>'));
  assert.ok(page.includes('Pick a plugin, press Details, then Connect or Install'));
  assert.ok(page.includes('Easy plugin setup'));
  assert.ok(page.includes('permissions first and only uses what you approve'));
  assert.match(page, /Your access stays scoped/);
  for (const filter of ['all','connected','productivity','developer','business','community','coming_soon','disabled']) {
    assert.ok(page.includes('data-filter="' + filter + '"'), filter);
  }
  assert.match(page, /data-install=/);
  assert.match(page, /data-connect=/);
  assert.match(page, /plugin-oauth-submit/);
  assert.match(page, /Connect with OAuth/);
  assert.match(page, /startOAuth/);
  assert.match(page, /installPlugin/);
  assert.match(page, /data-inspect=/);
  assert.match(page, /data-details=/);
  assert.match(page, /plugin-detail-view/);
  assert.match(page, /Stellar verified/);
  assert.match(page, /connectToken/);
  assert.match(page, /disconnectCurrentPlugin/);
  assert.match(page, /Connect plugin/);
  assert.match(page, /What it does/);
  assert.match(page, /No passwords shared/);
  assert.ok(page.includes('One switch on/off'));
  assert.match(page, /Only paste a token if OAuth is not available/);
  assert.match(page, /Setup info/);
  assert.match(page, /setupText/);
  assert.match(page, /OAuth setup needed/);
  assert.match(page, /encrypted server-side/);
  assert.match(page, /More plugins coming soon/);
  assert.match(page, /Need a plugin|Request a plugin/);
  assert.ok(app.includes('data-tab="plugins"'));
  assert.ok(app.includes('href="/plugins"'));
  assert.match(app, /onclick="location\.href='\/plugins'"/);
});



test('plugins sidebar keeps tappable visible icon badges', () => {
  assert.match(page, /FINAL PLUGINS SIDEBAR TAP \+ ICON FIX/);
  assert.match(page, /\.nav a\{position:relative!important;z-index:2!important;min-height:46px!important;pointer-events:auto!important;touch-action:manipulation!important;\}/);
  assert.match(page, /\.nav-ico\{display:inline-flex!important/);
});



test('developer OAuth setup is owner-only and hidden from normal accounts', () => {
  assert.equal(getPluginDefinition('github').audience, 'owner');
  assert.equal(getPluginDefinition('vercel').audience, 'owner');
  assert.match(manager, /oauthStatus:exposeSetup&&OAUTH_PLUGIN_IDS/);
  assert.match(manager, /oauthSetupMissingEnv:exposeSetup&&Array.isArray/);
  assert.ok(page.includes("if(!owner&&['github','vercel'].includes(id))"));
  assert.match(page, /OWNER-ONLY OAUTH MODAL POLISH/);
});


