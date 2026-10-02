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


test('Stripe Checkout enables cards, eligible wallets and Link without delayed bank methods', () => {
  assert.ok((checkout.match(/payment_method_types:\s*\['card', 'link'\]/g)||[]).length >= 3);
  assert.doesNotMatch(checkout, /payment_method_types:\s*\[[^\]]*(?:bacs_debit|sepa_debit|us_bank_account|acss_debit)[^\]]*\]/);
  assert.match(checkout, /checkoutIdempotencyKey\(sessionUser\.email, plan\)/);
  assert.match(checkout, /acquisition_source:\s*sourceName/);
  assert.match(checkout, /checkout-started-source-\$\{sourceName\}/);
});
