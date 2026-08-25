import assert from 'node:assert/strict';
import test from 'node:test';
import { subscriptionPriceForPlan } from '../api/create-checkout.js';

test('Starter monthly and annual checkout resolve their own canonical configured prices', () => {
  const env = {
    STRIPE_PRICE_ID_STARTER: 'price_starter_monthly',
    STRIPE_PRICE_ID_STARTER_ANNUAL: 'price_starter_annual',
    STRIPE_PRICE_ID_PLUS: 'price_plus_monthly',
    STRIPE_PRICE_ID_PRO: 'price_pro_monthly',
  };
  assert.equal(subscriptionPriceForPlan('starter', env), 'price_starter_monthly');
  assert.equal(subscriptionPriceForPlan('starter-annual', env), 'price_starter_annual');
});

test('Starter checkout accepts documented compatibility names and trims deployment values', () => {
  assert.equal(subscriptionPriceForPlan('starter', { STRIPE_PRICE_ID_STARTER_MONTHLY: ' price_starter_monthly\n' }), 'price_starter_monthly');
  assert.equal(subscriptionPriceForPlan('starter-annual', { STRIPE_PRICE_ID_STARTER_YEARLY: ' price_starter_yearly ' }), 'price_starter_yearly');
});

test('missing Starter prices never fall through to Plus or Pro checkout', () => {
  const env = { STRIPE_PRICE_ID_PLUS: 'price_plus_monthly', STRIPE_PRICE_ID_PRO: 'price_pro_monthly' };
  assert.equal(subscriptionPriceForPlan('starter', env), '');
  assert.equal(subscriptionPriceForPlan('starter-annual', env), '');
  assert.equal(subscriptionPriceForPlan('plus', env), 'price_plus_monthly');
  assert.equal(subscriptionPriceForPlan('pro', env), 'price_pro_monthly');
});
