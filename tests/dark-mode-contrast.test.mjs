import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('workspace is dark-first with readable text and muted contrast tokens', () => {
  assert.match(app, /:root\{color-scheme:dark;--bg:#080a11/);
  assert.match(app, /--text:#f7f8fb/);
  assert.match(app, /--muted:#a8afbd/);
  assert.match(app, /--panel:#11141d/);
});

test('interactive states remain visible without a light-mode dependency', () => {
  assert.match(app, /\.nav-link:hover,\.set-item:hover\{[^}]*color:#fff/);
  assert.match(app, /\.status\.error\{color:var\(--danger\)\}/);
  assert.match(app, /\.status\.good\{color:var\(--good\)\}/);
  assert.doesNotMatch(app, /document\.body\.classList\.add\('light'\)/);
});
