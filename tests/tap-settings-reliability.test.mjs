import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('interactive controls use first-tap mobile behavior', () => {
  assert.match(app, /button\{touch-action:manipulation\}/);
  assert.match(app, /button,a,textarea,input\{font:inherit;-webkit-tap-highlight-color:transparent\}/);
  assert.match(app, /\.btn\{min-height:44px/);
});

test('mobile drawer has a real backdrop and close path', () => {
  assert.match(app, /id="backdrop" onclick="closeResponsiveSidebar\(\)"/);
  assert.match(app, /function closeResponsiveSidebar\(\)/);
  assert.match(app, /\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
});

test('Escape closes transient workspace surfaces', () => {
  assert.match(app, /document\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'\)/);
  assert.match(app, /closeResponsiveSidebar\(\);dismissWelcome\(\);closeSettings\(\)/);
});

test('Settings has authoritative phone and desktop sizing', () => {
  assert.match(app, /\.settings-card\{width:min\(560px,100%\);max-height:86dvh;overflow:auto/);
  assert.match(app, /@media \(max-width: 520px\)[\s\S]*?max-height:90dvh/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('model picker remains scrollable and reachable on phone', () => {
  assert.match(app, /#model-menu\{[^}]*overflow:auto/);
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?#model-menu\{left:12px;right:12px/);
});
