import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const plugins = readFileSync(new URL('../plugins.html', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');

test('current clean app exposes the public capabilities users can actually use', () => {
  assert.match(app, /id="image-upload-btn"/);
  assert.match(app, /id="voice-input-btn"/);
  assert.match(app, /id="stellarx-btn"/);
  assert.match(app, /href="\/plugins">Plugins<\/a>/);
  assert.match(app, /data-open="credits"/);
  assert.match(app, /href="\/support">Help<\/a>/);
});

test('StellarX is a reviewed tool handoff rather than a fake model option', () => {
  assert.match(app, /function openComputerActionCard\(\)/);
  assert.match(app, /Review computer action/);
  assert.match(app, /Check the task before handing it to StellarX/);
  assert.match(app, /function launchComputerTask\(\)/);
  assert.match(desktop, /StellarX PC Agent/);
});

test('public model picker lineup stays explicit and plan-gated', () => {
  assert.match(app, /const MODELS=\{spark:'Spark',star:'Star',comet:'Comet',nova:'Nova'\}/);
  assert.match(app, /function renderModelsPanel\(\)/);
  assert.match(app, /allowedModels\.includes\(key\)/);
  assert.match(app, /credits\/message/);
});

test('settings is a bounded mobile-safe panel with real account tools', () => {
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh;overflow:auto/);
  assert.match(app, /@media\(max-width:540px\)[\s\S]*?max-height:91dvh/);
  assert.match(app, /safe-area-inset-bottom/);
  assert.match(app, /id="email-agent-nav"/);
  assert.match(app, /href="\/plugins"/);
});

test('owner controls are rendered only from server-verified owner state', () => {
  assert.match(app, /function isOwner\(\)\{return serverOwner===true\}/);
  assert.match(app, /serverOwner=data\.owner===true\|\|account\.owner===true/);
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
});

test('plugins directory is backed by server-filtered account connections', () => {
  assert.match(plugins, /pluginApi\('list'\)/);
  assert.match(plugins, /Owner-only integrations are never offered to standard accounts/);
});
