import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const support = fs.readFileSync(new URL('../support.html', import.meta.url), 'utf8');

test('public browser pages do not use blocking alert prompts', () => {
  assert.doesNotMatch(app, /\balert\s*\(/);
  assert.doesNotMatch(app, /\bprompt\s*\(/);
  assert.doesNotMatch(support, /\balert\s*\(/);
});

test('app exposes non-blocking status surfaces instead of alert popups', () => {
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /class="status/);
});
