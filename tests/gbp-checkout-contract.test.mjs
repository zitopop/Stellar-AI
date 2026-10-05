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
  assert.match(checkout, /metadata:\s*\{\s*app:\s*'stellar-ai',\s*email:\s*sessionUser\.email,\s*plan,\s*country,\s*currency,\s*acquisition_source:\s*sourceName\s*\}/);
});


test('Stripe Checkout uses dynamic payment methods and keeps unnecessary collection off', () => {
  assert.doesNotMatch(checkout, /payment_method_types:\s*\['card'\]/);
  assert.doesNotMatch(checkout, /Temporary safety guard/);
  assert.ok((checkout.match(/phone_number_collection:\s*\{ enabled: false \}/g)||[]).length >= 3);
  assert.match(checkout, /dynamically surface eligible wallets and payment methods/);
  assert.match(checkout, /checkoutIdempotencyKey\(sessionUser\.email, plan\)/);
  assert.match(checkout, /acquisition_source:\s*sourceName/);
  assert.match(checkout, /checkout-started-source-\$\{sourceName\}/);
});

test('business service checkout defers onboarding details until after payment', () => {
  assert.doesNotMatch(checkout, /custom_fields:/);
  assert.doesNotMatch(checkout, /name_collection:/);
  assert.match(checkout, /post_purchase_onboarding:\s*'required'/);
  assert.match(checkout, /After payment, Stellar securely collects your business details and domain choice before activation/);
});
