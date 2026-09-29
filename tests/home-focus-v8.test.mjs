import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('home keeps one clear composer and removes starter clutter', () => {
  assert.equal((app.match(/id="chatForm"/g) || []).length, 1);
  assert.equal((app.match(/id="prompt"/g) || []).length, 1);
  assert.doesNotMatch(app, /<div class="quick">/);
});

test('model remains visible in the header', () => {
  assert.match(app, /<header class="top">[\s\S]*?id="modelBtn"/);
  assert.match(app, /id="modelLabel">Star · 5 credits/);
});

test('responsive touch sizing is preserved', () => {
  assert.match(app, /\.btn,.nav\{min-height:44px/);
  assert.match(app, /@media\(max-width:640px\)/);
  assert.match(app, /@media\(max-width:540px\)/);
});
