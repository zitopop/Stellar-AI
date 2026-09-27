import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const guide = readFileSync(new URL('../stellar-capabilities-guide.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('Stellar capabilities guide explains what the app can do', () => {
  assert.match(guide, /What Stellar AI can do for you/);
  assert.match(guide, /Website help/);
  assert.match(guide, /Business help/);
  assert.match(guide, /Credits/);
  assert.match(guide, /Support/);
  assert.match(guide, /Owner tools/);
});

test('service worker loads the capabilities guide without replacing existing app scripts', () => {
  assert.match(sw, /stellar-sw-2026-09-27-capabilities-guide-v1/);
  assert.match(sw, /stellar-capabilities-guide\.js/);
  assert.match(sw, /capabilityGuideLoader/);
  assert.match(sw, /\/currency\.js/);
  assert.match(sw, /\/stellar-settings-extensions\.js/);
});
