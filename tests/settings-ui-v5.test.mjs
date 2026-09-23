import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Settings exposes the current account plugins voice plans billing and support routes', () => {
  assert.match(app, /id="auth-settings-row"/);
  assert.match(app, /href="\/plugins"/);
  assert.match(app, /href="\/jarvis"/);
  assert.match(app, /href="\/#plans"/);
  assert.match(app, /id="set-billing-row"/);
  assert.match(app, /href="\/support"/);
});

test('phone Settings is a full-width bounded bottom sheet', () => {
  assert.match(app, /@media \(max-width: 520px\)[\s\S]*?\.settings-panel\{padding:0;display:none\}/);
  assert.match(app, /\.settings-card\{width:100%;max-height:90dvh;margin:10dvh 0 0;border-radius:22px 22px 0 0/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('desktop Settings keeps internal scrolling and bounded width', () => {
  assert.match(app, /\.settings-card\{width:min\(560px,100%\);max-height:86dvh;overflow:auto/);
});

test('settings rows retain touch-safe heights', () => {
  assert.match(app, /\.settings-row\{[^}]*min-height:46px/);
});
