import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('blocking overlays start visually inactive', () => {
  assert.match(app, /id="backdrop" aria-hidden="true"/);
  assert.match(app, /\.drawer-backdrop\{display:none\}/);
  assert.match(app, /\.panel-backdrop\{position:fixed;[\s\S]*?display:none/);
});

test('sidebar backdrop cannot stay clickable after close', () => {
  assert.match(app, /function closeSide\(\)\{side\.classList\.remove\('open'\);backdrop\.classList\.remove\('open'\)\}/);
  assert.match(app, /function openSide\(\)\{side\.classList\.add\('open'\);backdrop\.classList\.add\('open'\)\}/);
  assert.match(app, /backdrop\.addEventListener\('click',closeSide\)/);
});

test('settings overlay closes on backdrop and Escape', () => {
  assert.match(app, /function closePanel\(\)\{panelBackdrop\.classList\.remove\('open'\)\}/);
  assert.match(app, /panelBackdrop\.addEventListener\('click',e=>\{if\(e\.target===panelBackdrop\)closePanel\(\)\}\)/);
  assert.match(app, /if\(e\.key==='Escape'\)\{closeSide\(\);closePanel\(\)\}/);
});
