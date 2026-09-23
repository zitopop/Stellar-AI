import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('base app prevents horizontal overflow down to 320px', () => {
  assert.match(app, /html,body\{min-width:320px;max-width:100%;overflow-x:hidden\}/);
});

test('mobile drawer and controls remain reachable', () => {
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?\.side\{position:fixed/);
  assert.match(app, /\.side-close,\.mobile-menu\{display:inline-flex\}/);
  assert.match(app, /\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
});

test('phone composer and settings use touch-safe dimensions', () => {
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.composer-tool\{min-height:44px\}/);
  assert.match(app, /@media \(max-width: 520px\)[\s\S]*?\.settings-card\{width:100%;max-height:90dvh/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('model menu remains usable on phone and tablet', () => {
  assert.match(app, /#model-menu\{[\s\S]*?overflow:auto/);
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?#model-menu\{left:12px;right:12px/);
});

test('desktop keeps a dedicated sidebar and centered content width', () => {
  assert.match(app, /grid-template-columns:var\(--side\) minmax\(0,1fr\)/);
  assert.match(app, /--max:860px/);
});
