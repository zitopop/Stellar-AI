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

test('annual and monthly prices normalize to the same plan access tier', () => {
  assert.equal(normalisePlan('lite'), 'lite');
  assert.equal(normalisePlan('lite-annual'), 'lite');
  assert.equal(normalisePlan('pro-annual'), 'pro');
  assert.equal(normalisePlan('unknown'), null);
});
