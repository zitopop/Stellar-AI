import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('app navigation receives a simple workspace layer that hides busy secondary pages', () => {
  assert.match(sw, /stellar-simple-workspace-v1/);
  assert.match(sw, /function simpleWorkspaceLayer\(\)/);
  assert.match(sw, /BUSY_WORDS/);
  assert.match(sw, /investor/);
  assert.match(sw, /operator/);
  assert.match(sw, /seo/);
  assert.match(sw, /business/);
  assert.match(sw, /dataset\.stellarSimpleHidden/);
  assert.match(sw, /quick/);
  assert.match(sw, /quality-strip/);
});

test('simple workspace keeps core user paths visible', () => {
  assert.match(sw, /KEEP_WORDS/);
  assert.match(sw, /plans/);
  assert.match(sw, /credits/);
  assert.match(sw, /settings/);
  assert.match(sw, /support/);
  assert.match(sw, /legal/);
  assert.match(sw, /billing/);
});
