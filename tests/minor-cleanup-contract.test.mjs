import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const support = fs.readFileSync(new URL('../support.html', import.meta.url), 'utf8');

test('current UI copy keeps support and safety language visible', () => {
  assert.match(app, /fake tested claims/i);
  assert.match(app, /fake tested claims/i);
  assert.match(support, /what you clicked/i);
  assert.match(support, /screenshots/i);
});

test('browser storage access remains guarded through Store helper', () => {
  assert.match(app, /const Store=/);
  assert.match(app, /try\{localStorage/);
});
