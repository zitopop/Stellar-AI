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

test('Starter checkout supports the existing Vercel StellarStarter names without a tier fallback', () => {
  const env = { StellarStarter: 'price_starter_monthly', StellarStarterYear: 'price_starter_yearly' };
  assert.equal(subscriptionPriceForPlan('starter', env), 'price_starter_monthly');
  assert.equal(subscriptionPriceForPlan('starter-annual', env), 'price_starter_yearly');
});

test('all monthly and annual paid plans resolve their canonical price IDs', () => {
  const env = {
    STRIPE_PRICE_ID_STARTER: 'price_starter_monthly',
    STRIPE_PRICE_ID_STARTER_ANNUAL: 'price_starter_annual',
    STRIPE_PRICE_ID_PLUS: 'price_plus_monthly',
    STRIPE_PRICE_ID_PLUS_ANNUAL: 'price_plus_annual',
    STRIPE_PRICE_ID_PRO: 'price_pro_monthly',
    STRIPE_PRICE_ID_PRO_ANNUAL: 'price_pro_annual',
  };
  for (const [plan, expected] of Object.entries({
    starter: 'price_starter_monthly',
    'starter-annual': 'price_starter_annual',
    plus: 'price_plus_monthly',
    'plus-annual': 'price_plus_annual',
    pro: 'price_pro_monthly',
    'pro-annual': 'price_pro_annual',
  })) assert.equal(subscriptionPriceForPlan(plan, env), expected);
});

test('Plus and Pro checkout accept monthly/yearly deployment aliases', () => {
  const env = {
    STRIPE_PRICE_ID_PLUS_MONTHLY: ' price_plus_monthly ',
    STRIPE_PRICE_ID_PLUS_YEARLY: ' price_plus_yearly ',
    STRIPE_PRICE_ID_PRO_MONTHLY: 'price_pro_monthly',
    STRIPE_PRICE_ID_PRO_YEARLY: 'price_pro_yearly',
  };
  assert.equal(subscriptionPriceForPlan('plus', env), 'price_plus_monthly');
  assert.equal(subscriptionPriceForPlan('plus-annual', env), 'price_plus_yearly');
  assert.equal(subscriptionPriceForPlan('pro', env), 'price_pro_monthly');
  assert.equal(subscriptionPriceForPlan('pro-annual', env), 'price_pro_yearly');
});

test('currency-specific Stripe prices are opt-in and fall back safely to GBP', () => {
  const env = {
    STRIPE_PRICE_ID_STARTER: 'price_starter_gbp',
    STRIPE_PRICE_ID_STARTER_USD: 'price_starter_usd',
    STRIPE_PRICE_ID_STARTER_ANNUAL_USD: 'price_starter_annual_usd',
  };
  assert.equal(subscriptionPriceForPlan('starter', env, 'USD'), 'price_starter_usd');
  assert.equal(subscriptionPriceForPlan('starter-annual', env, 'USD'), 'price_starter_annual_usd');
  assert.equal(subscriptionPriceForPlan('starter', env, 'EUR'), 'price_starter_gbp');
  assert.equal(subscriptionPriceForPlan('starter', env, 'GBP'), 'price_starter_gbp');
});

test('missing Starter prices never fall through to Plus or Pro checkout', () => {
  const env = { STRIPE_PRICE_ID_PLUS: 'price_plus_monthly', STRIPE_PRICE_ID_PRO: 'price_pro_monthly' };
  assert.equal(subscriptionPriceForPlan('starter', env), '');
  assert.equal(subscriptionPriceForPlan('starter-annual', env), '');
  assert.equal(subscriptionPriceForPlan('plus', env), 'price_plus_monthly');
  assert.equal(subscriptionPriceForPlan('pro', env), 'price_pro_monthly');
  assert.equal(subscriptionPriceForPlan('plus-annual', env), '');
  assert.equal(subscriptionPriceForPlan('pro-annual', env), '');
});
