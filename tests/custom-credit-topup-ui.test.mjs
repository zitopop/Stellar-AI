import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../lib/pricing.js', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('custom credit top-up UI exposes bounded customer choice', () => {
  assert.match(analytics, /stellar-custom-credit-topup/);
  assert.match(analytics, /Custom credits/);
  assert.match(analytics, /Choose £3–£200 in 50p steps/);
  assert.match(analytics, /custom-topup-pound/);
  assert.match(analytics, /data-custom-credit-estimate/);
});

test('custom credit top-up reuses the server top-up checkout contract', () => {
  assert.match(analytics, /plan:'topup'/);
  assert.match(analytics, /amount:amountPence/);
  assert.match(analytics, /checkout\.stripe\.com/);
  assert.match(pricing, /TOPUP_MIN_PENCE = 300/);
  assert.match(pricing, /TOPUP_MAX_PENCE = 20000/);
  assert.match(pricing, /amount % 50 === 0/);
  assert.match(checkout, /isValidTopupPence\(rawPence\)/);
});
