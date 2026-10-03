import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Settings exposes account, plugins, tools, plans, billing, legal and support paths', () => {
  assert.match(app, /function renderSettingsPanel\(\)/);
  assert.match(app, /href="\/plugins"/);
  assert.match(app, /id="email-agent-nav" href="\/email-agent"/);
  assert.match(app, /href="\/desktop"/);
  assert.match(app, /id="jarvis-nav" href="\/jarvis"/);
  assert.match(app, /id="set-billing-row"/);
  assert.match(app, /href="\/legal"/);
  assert.match(app, /href="\/support">Help<\/a>/);
});

test('phone Settings is a full-width bounded bottom sheet', () => {
  assert.match(app, /@media\(max-width:540px\)[\s\S]*?\.panel-backdrop\{align-items:end;padding:0\}/);
  assert.match(app, /\.panel\{width:100%;max-height:91dvh;border-radius:24px 24px 0 0/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('desktop Settings keeps internal scrolling and bounded width', () => {
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh;overflow:auto/);
});

test('settings rows retain touch-safe heights', () => {
  assert.match(app, /\.row\{min-height:46px\}/);
});

test('Settings visually matches the calm chat workspace', () => {
  assert.match(app, /background:var\(--panel\)/);
  assert.match(app, /\.panel-head\{position:sticky/);
  assert.match(app, /\.panel-body\{padding:16px\}/);
});
