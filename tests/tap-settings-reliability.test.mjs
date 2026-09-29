import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('interactive controls use first-tap mobile behavior', () => {
  assert.match(app, /button,a\{touch-action:manipulation;-webkit-tap-highlight-color:transparent\}/);
  assert.match(app, /button,a,textarea,input,select\{font:inherit\}/);
  assert.match(app, /\.btn,.nav\{min-height:44px/);
});

test('mobile drawer has a real backdrop and close path', () => {
  assert.match(app, /id="backdrop" aria-hidden="true"/);
  assert.match(app, /function closeSide\(\)/);
  assert.match(app, /backdrop\.addEventListener\('click',closeSide\)/);
  assert.match(app, /\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
});

test('Escape closes transient workspace surfaces', () => {
  assert.match(app, /document\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'\)\{closeSide\(\);closePanel\(\)\}\}\)/);
});

test('Settings has authoritative phone and desktop sizing', () => {
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh;overflow:auto/);
  assert.match(app, /@media\(max-width:540px\)[\s\S]*?max-height:91dvh/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('model picker remains reachable through the same scrollable panel', () => {
  assert.match(app, /id="modelBtn"[^>]*data-open="models"/);
  assert.match(app, /function renderModelsPanel\(\)/);
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh;overflow:auto/);
});
