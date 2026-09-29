import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('app keeps phone controls tappable and inactive overlays inert',()=>{
  assert.match(app,/\.drawer-backdrop\{display:block;position:fixed;[\s\S]*?opacity:0;pointer-events:none\}/);
  assert.match(app,/\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
  assert.match(app,/\.panel-backdrop\{position:fixed;[\s\S]*?display:none/);
  assert.match(app,/\.panel-backdrop\.open\{display:grid\}/);
  assert.match(app,/id="accountButton"[^>]*type="button"/);
});

test('service worker fetches navigation HTML fresh before applying patches',()=>{
  assert.match(sw,/const SW_VERSION = 'stellar-sw-/);
  assert.match(sw,/request\.mode === 'navigate'/);
  assert.match(sw,/fetch\(request, \{ cache: 'no-store' \}\)/);
  assert.match(sw,/patchAppNavigationResponse/);
  assert.match(sw,/patchHomeNavigationResponse/);
});
