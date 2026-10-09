import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LIVE_GBP_SUBSCRIPTION_PRICES, validateSubscriptionPrice } from '../api/create-checkout.js';

const terms = {
  starter: [800, 'month'],
  'starter-annual': [6700, 'year'],
  plus: [2000, 'month'],
  'plus-annual': [16800, 'year'],
  pro: [7500, 'month'],
  'pro-annual': [63000, 'year'],
};

const price = (amount, interval, overrides = {}) => ({
  active: true,
  currency: 'gbp',
  type: 'recurring',
  unit_amount: amount,
  recurring: { interval, interval_count: 1 },
  ...overrides,
});

test('all six live prices accept exactly their expected GBP terms', async () => {
  for (const [plan, [amount, interval]] of Object.entries(terms)) {
    const priceId = LIVE_GBP_SUBSCRIPTION_PRICES[plan];
    const stripe = { prices: { retrieve: async id => {
      assert.equal(id, priceId);
      return price(amount, interval);
    } } };
    assert.equal(await validateSubscriptionPrice(stripe, plan, priceId), true, plan);
  }
});

test('mispriced, inactive, non-recurring or wrong-cadence prices fail closed', async () => {
  const id = LIVE_GBP_SUBSCRIPTION_PRICES.plus;
  for (const wrong of [
    price(1900, 'month'),
    price(2000, 'year'),
    price(2000, 'month', { active: false }),
    price(2000, 'month', { currency: 'usd' }),
    price(2000, 'month', { type: 'one_time' }),
    price(2000, 'month', { recurring: { interval: 'month', interval_count: 2 } })
  ]) {
    assert.equal(await validateSubscriptionPrice(
      { prices: { retrieve: async () => wrong } }, 'plus', id
    ), false);
  }
});

test('unknown and malformed plans cannot reach Stripe', async () => {
  let queried = false;
  const stripe = { prices: { retrieve: async () => { queried = true; } } };
  assert.equal(await validateSubscriptionPrice(stripe, 'free', 'price_valid123'), false);
  assert.equal(await validateSubscriptionPrice(stripe, 'starter', 'not-a-price'), false);
  assert.equal(queried, false);
});

test('chat-first navigation retains plugins and billing entry points', () => {
  const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  assert.match(app, /id="side-plan-button"[^>]*data-open="plans"/);
  assert.match(app, /href="\/plugins" title="Explore Stellar plugins"/);
  assert.match(app, /id="stellar-focused-chat-billing-v97"/);
  assert.match(app, /\.side-primary\{display:none!important\}/);
  assert.match(app, /id="newChatBtn"/);
  assert.match(app, /id="chatForm"/);
});

test('full pricing page displays an alternative yearly checkout link', () => {
  const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
  assert.match(plans, /alternate\.hidden=false/);
  assert.match(plans, /alternate\.href='\/app\?upgrade='/);
  assert.match(plans, /Yearly is charged upfront/);
});
