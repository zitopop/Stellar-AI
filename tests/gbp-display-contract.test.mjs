import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const terms = fs.readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('public pricing copy continues to show UK GBP plan prices', () => {
  for (const value of ['£8', '£20', '£75', 'GBP']) assert.ok(index.includes(value), 'index missing ' + value);
  for (const value of ['£8', '£20', '£75', 'GBP']) assert.ok(terms.includes(value), 'terms missing ' + value);
});

test('checkout remains server-owned and Stripe price-id based', () => {
  assert.match(checkout, /STRIPE_PRICE_ID_STARTER/);
  assert.match(checkout, /STRIPE_PRICE_ID_PLUS/);
  assert.match(checkout, /STRIPE_PRICE_ID_PRO/);
  assert.match(checkout, /currency = 'GBP'/);
});
