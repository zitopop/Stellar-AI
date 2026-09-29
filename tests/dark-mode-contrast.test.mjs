import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('workspace is dark-first with readable text and muted contrast tokens', () => {
  assert.match(app, /:root\{color-scheme:dark;--bg:#0b0c10/);
  assert.match(app, /--text:#f7f8fb/);
  assert.match(app, /--muted:#929baa/);
  assert.match(app, /--panel:#12141c/);
});

test('interactive states remain visible without a light-mode dependency', () => {
  assert.match(app, /\.btn:hover,\.nav:hover\{background:rgba\(255,255,255,.055\);color:#fff\}/);
  assert.match(app, /\.status\.error\{color:var\(--bad\)\}/);
  assert.match(app, /\.status\.good\{color:var\(--good\)\}/);
  assert.doesNotMatch(app, /classList\.add\('light'\)/);
});
