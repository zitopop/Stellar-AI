import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('critical app styles are inline and available before body markup', () => {
  const style = app.indexOf('<style>');
  const headEnd = app.indexOf('</head>');
  assert.ok(style > 0 && style < headEnd);
  assert.doesNotMatch(app, /stellar-chat-first-v21\.css|stellar-settings-v22\.css|stellar-app-focus-v23\.css|stellar-chatgpt-v24\.css/);
});

test('credit balance is present in markup and updated from plan state', () => {
  assert.match(app, /id="creditCount"/);
  assert.match(app, /creditCount\.textContent=Number\.isFinite\(total\)\?fmt\(total\):'∞'/);
  assert.match(app, /function totalCredits\(\)/);
});

test('closed overlays cannot steal taps and opening a panel closes the drawer', () => {
  assert.match(app, /\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
  assert.match(app, /\.panel-backdrop\.open\{display:grid\}/);
  assert.match(app, /function openPanel\(kind\)\{[\s\S]*?closeSide\(\);panelBackdrop\.classList\.add\('open'\)/);
  assert.match(app, /if\(e\.key==='Escape'\)\{closeSide\(\);closePanel\(\)\}/);
});

test('phone and tablet layouts keep credits and settings usable', () => {
  assert.match(app, /@media\(max-width:900px\)/);
  assert.match(app, /@media\(max-width:540px\)/);
  assert.match(app, /\.panel\{width:100%;max-height:91dvh/);
  assert.match(app, /safe-area-inset-bottom/);
});
