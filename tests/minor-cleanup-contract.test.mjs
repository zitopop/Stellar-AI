import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const support = fs.readFileSync(new URL('../support.html', import.meta.url), 'utf8');

test('current UI keeps a direct help route and support guidance visible', () => {
  assert.match(app, /href="\/support">Help<\/a>/);
  assert.match(support, /what you clicked/i);
  assert.match(support, /screenshots/i);
});

test('browser storage access is guarded with try-catch wrappers', () => {
  assert.match(app, /function store\(\)\{try\{const v=JSON\.parse\(localStorage\.getItem/);
  assert.match(app, /catch\{return \{\}\}/);
  assert.match(app, /function loadSessions\(\)\{try\{/);
});
