import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('Google identity is loaded asynchronously and service-worker navigation stays finite', () => {
  assert.match(app, /<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer><\/script>/);
  assert.match(sw, /self\.addEventListener\('fetch'/);
  assert.doesNotMatch(sw, /while\s*\(true\)|for\s*\(;;\)/);
  assert.match(sw, /OFFLINE_URL/);
});
