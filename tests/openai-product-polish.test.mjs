import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');

test('landing uses the calmer product-first workspace treatment', () => {
  assert.match(landing, /stellar-openai-product-polish-v35/);
  assert.match(landing, /Ask anything\.<br>Get real work done\./);
  assert.match(landing, /Start free/);
  assert.match(landing, /href="\/app\?welcome=1">Chat<\/a>/);
  assert.match(landing, /@media\(max-width:430px\)/);
});

test('settings are grouped into understandable product sections', () => {
  assert.match(app, /stellar-settings-product-polish-v35/);
  assert.match(app, /Plan &amp; usage/);
  assert.match(app, /Apps &amp; tools/);
  assert.match(app, /Data &amp; support/);
  assert.match(app, /data-action="export-chat"/);
  assert.match(app, /Ctrl \/ ⌘ K/);
  assert.match(app, /href="\/support"/);
});

test('settings preserve owner-only tools and real billing paths', () => {
  assert.match(app, /id="jarvis-nav"/);
  assert.match(app, /id="deploy-center-nav"/);
  assert.match(app, /id="set-billing-row"/);
  assert.match(app, /data-action="open-billing"/);
  assert.match(app, /href="\/plugins"/);
});

test('plans page matches the calmer product shell', () => {
  assert.match(plans, /stellar-plans-product-polish-v35/);
  assert.match(plans, /body\{background:#0b0b0b!important\}/);
  assert.match(plans, /\.plan\.plus\{background:#171717!important/);
});
