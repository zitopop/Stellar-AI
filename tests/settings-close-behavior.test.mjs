import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Settings closes from backdrop, Escape and explicit close button', () => {
  assert.match(app, /id="panelBackdrop"/);
  assert.match(app, /id="closePanel" aria-label="Close"/);
  assert.match(app, /panelBackdrop\.addEventListener\('click',e=>\{if\(e\.target===panelBackdrop\)closePanel\(\)\}\)/);
  assert.match(app, /document\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'\)\{closeSide\(\);closePanel\(\)\}\}\)/);
  assert.match(app, /\$\('closePanel'\)\.addEventListener\('click',closePanel\)/);
});

test('Settings returns keyboard focus after dismissal', () => {
  assert.match(app, /panelReturnFocus=null/);
  assert.match(app, /panelReturnFocus=document\.activeElement instanceof HTMLElement\?document\.activeElement:null/);
  assert.match(app, /const target=panelReturnFocus;panelReturnFocus=null/);
  assert.match(app, /target&&document\.contains\(target\)/);
  assert.match(app, /setTimeout\(\(\)=>target\.focus\(\),0\)/);
});

test('Settings close control is touch safe and receives focus when opened', () => {
  assert.match(app, /\.close\{width:44px;height:44px/);
  assert.match(app, /id="closePanel" aria-label="Close"/);
  assert.match(app, /setTimeout\(\(\)=>\$\('closePanel'\)\?\.focus\(\),0\)/);
});
