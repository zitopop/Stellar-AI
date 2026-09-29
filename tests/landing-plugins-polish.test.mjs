import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const plugins = readFileSync(new URL('../plugins.html', import.meta.url), 'utf8');

test('landing gives direct paths into the core Stellar product', () => {
  assert.match(landing, /stellar-landing-plugin-polish-v36/);
  assert.match(landing, /aria-label="Explore Stellar"/);
  for (const label of ['Chat','StellarX','Plugins','Plans']) assert.match(landing, new RegExp('>'+label+'<'));
});

test('plugins directory exposes clearer search and connection state', () => {
  assert.match(plugins, /stellar-plugins-polish-v36/);
  assert.match(plugins, /id="clear-search"/);
  assert.match(plugins, /id="tool-count"/);
  assert.match(plugins, /id="connection-count"/);
  assert.match(plugins, /Your connections/);
  assert.match(plugins, /Browse tools/);
  assert.match(plugins, /Permissions/);
});

test('connected plugin cards show public verification and permissions only from API data', () => {
  assert.match(plugins, /plugin\.developer/);
  assert.match(plugins, /plugin\.verified/);
  assert.match(plugins, /plugin\.permissions/);
  assert.match(plugins, /plugin\.route&&plugin\.enabled/);
  assert.doesNotMatch(plugins, /data-plugin="github"/);
  assert.doesNotMatch(plugins, /data-plugin="vercel"/);
});

test('StellarX desktop tool is presented as an available beta surface', () => {
  assert.match(plugins, /StellarX desktop tasks/);
  assert.match(plugins, /<span class="status ready">Beta<\/span>/);
  assert.match(plugins, /href="\/desktop">Open StellarX<\/a>/);
});
