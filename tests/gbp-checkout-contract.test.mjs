import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('live checkout is GBP-only regardless of customer country', () => {
  assert.match(checkout, /const currency = 'GBP';/);
  assert.doesNotMatch(checkout, /currency:\s*requestedCurrency/);
  assert.doesNotMatch(checkout, /allowedCurrencies/);
  assert.match(checkout, /subscriptionPriceForPlan\(plan, process\.env, currency\)/);
  assert.match(checkout, /currency:\s*'gbp'/);
});

test('customer country is still retained for analytics metadata', () => {
  assert.match(checkout, /x-vercel-ip-country/);
  assert.match(checkout, /metadata:\s*\{\s*email:\s*sessionUser\.email,\s*plan,\s*country,\s*currency\s*\}/);
});
