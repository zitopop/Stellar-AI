import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('base app constrains the workspace without horizontal layout expansion', () => {
  assert.match(app, /html,body\{margin:0;width:100%;height:100%;overflow:hidden/);
  assert.match(app, /grid-template-columns:260px minmax\(0,1fr\)/);
  assert.match(app, /min-width:0/);
});

test('mobile drawer and controls remain reachable', () => {
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?\.side\{position:fixed/);
  assert.match(app, /\.mobile-menu\{display:inline-flex\}/);
  assert.match(app, /\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
});

test('phone composer and settings use touch-safe dimensions', () => {
  assert.match(app, /@media\(max-width:540px\)/);
  assert.match(app, /\.panel\{width:100%;max-height:91dvh;border-radius:24px 24px 0 0/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('model selection remains usable on phone and tablet', () => {
  assert.match(app, /id="modelBtn"/);
  assert.match(app, /function renderModelsPanel\(\)/);
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh;overflow:auto/);
});

test('desktop keeps a dedicated sidebar and centered content width', () => {
  assert.match(app, /grid-template-columns:260px minmax\(0,1fr\)/);
  assert.match(app, /--max:820px/);
});
