import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPUP_MAX_PENCE, TOPUP_MIN_PENCE, clampTopupPence, normalisePlan, topupBonusPence } from '../lib/pricing.js';

test('top-up bonus schedule matches the customer-facing offers', () => {
  assert.equal(topupBonusPence(300), 0);
  assert.equal(topupBonusPence(1000), 100);
  assert.equal(topupBonusPence(2500), 375);
  assert.equal(topupBonusPence(5000), 1000);
});

test('top-up limits are clamped to the checkout contract', () => {
  assert.equal(clampTopupPence(1), TOPUP_MIN_PENCE);
  assert.equal(clampTopupPence(25000), TOPUP_MAX_PENCE);
  assert.equal(clampTopupPence(1250), 1250);
});

test('annual and monthly prices normalize to the canonical plan access tier', () => {
  assert.equal(normalisePlan('starter'), 'starter');
  assert.equal(normalisePlan('starter-annual'), 'starter');
  assert.equal(normalisePlan('plus'), 'plus');
  assert.equal(normalisePlan('plus-annual'), 'plus');
  assert.equal(normalisePlan('lite'), 'plus');
  assert.equal(normalisePlan('lite-annual'), 'plus');
  assert.equal(normalisePlan('pro-annual'), 'pro');
  assert.equal(normalisePlan('unknown'), null);
});
