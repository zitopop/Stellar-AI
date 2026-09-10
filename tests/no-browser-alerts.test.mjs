import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const app = read('app.html');
const growth = read('assets/js/stellar-growth-v1.js');

test('public app flows do not use blocking browser alert popups', () => {
  assert.doesNotMatch(app, /\balert\s*\(/);
  assert.doesNotMatch(growth, /\balert\s*\(/);
});

test('Stellar notices are accessible and dismissible', () => {
  assert.match(app, /function showStellarNotice\(message, tone = 'info', options = \{\}\)/);
  assert.match(app, /stack\.setAttribute\('aria-live', 'polite'\)/);
  assert.match(app, /item\.setAttribute\('role', tone === 'error' \? 'alert' : 'status'\)/);
  assert.match(app, /close\.setAttribute\('aria-label', 'Dismiss notification'\)/);
  assert.match(app, /white-space:pre-wrap/);
});
