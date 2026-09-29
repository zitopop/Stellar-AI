import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const refinements = readFileSync(new URL('../lib/assets/stellar-refinements.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('legacy refinement layer still contains tap-blocker rescue rules for older pages', () => {
  assert.match(refinements, /tap-blocker-rescue-v30/);
  assert.match(refinements, /pointer-events:none!important/);
});

test('clean app blockers are non-interactive while closed and only activate explicitly', () => {
  assert.match(app, /\.drawer-backdrop\{display:none\}/);
  assert.match(app, /\.drawer-backdrop\.open\{opacity:1;pointer-events:auto\}/);
  assert.match(app, /\.panel-backdrop\{[\s\S]*?display:none/);
  assert.match(app, /\.panel-backdrop\.open\{display:grid\}/);
  assert.match(app, /backdrop\.addEventListener\('click',closeSide\)/);
  assert.match(app, /panelBackdrop\.addEventListener\('click'/);
});
