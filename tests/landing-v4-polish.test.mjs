import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');

test('landing page v4 keeps a clean conversion-first hero', () => {
  assert.match(analytics, /stellar-public-conversion-polish-v4/);
  assert.match(analytics, /Your AI workspace/);
  assert.match(analytics, /STELLAR AI · CLEAN WORKSPACE/);
  assert.match(analytics, /Start free/);
  assert.match(analytics, /See plans/);
});

test('landing page explains value without adding noisy sections', () => {
  assert.match(analytics, /stellar-home-focus/);
  assert.match(analytics, /stellar-landing-belt/);
  assert.match(analytics, /stellar-landing-flow/);
  assert.match(analytics, /Chat that gets work done/);
  assert.match(analytics, /Website and business help/);
  assert.match(analytics, /Ask normally/);
  assert.match(analytics, /Approve bigger actions/);
});

test('landing page keeps credits and community promo wording clear without hard-coding allowance tests', () => {
  assert.match(analytics, /Free to start · \d[\d,]* credits\/day/);
  assert.match(analytics, /promo and giveaway credits for Discord events/);
  assert.doesNotMatch(analytics, /free money/i);
});

test('landing page remains mobile safe', () => {
  assert.match(analytics, /min-width:320px/);
  assert.match(analytics, /overflow-x:hidden/);
  assert.match(analytics, /max-width:100%/);
  assert.match(analytics, /grid-template-columns:1fr/);
});
