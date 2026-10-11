import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAN_DEFINITIONS,
  creditCostForModel,
  getPlanDefinition,
  normalisePlan,
} from '../lib/pricing.js';

const PUBLIC_TIERS = ['spark', 'star', 'comet', 'nova'];

test('public plans expose progressively more capable models', () => {
  const expectations = {
    free: ['spark'],
    starter: ['spark', 'star'],
    plus: ['spark', 'star', 'comet'],
    pro: PUBLIC_TIERS,
  };
  for (const [plan, models] of Object.entries(expectations)) {
    assert.deepEqual(getPlanDefinition(plan).models, models, plan);
    assert.ok(getPlanDefinition(plan).requestsPerHour > 0);
  }
});

test('free allowance and Fast cost provide exactly 15 included generations', () => {
  const plan = getPlanDefinition('free');
  assert.equal(plan.creditPeriod, 'day');
  assert.equal(plan.includedCredits, 30);
  assert.equal(creditCostForModel('spark', 'free'), 2);
  assert.equal(plan.includedCredits / creditCostForModel('spark', 'free'), 15);
});

test('paid plan allowances are monthly and more generous than Free', () => {
  for (const plan of ['starter', 'plus', 'pro']) {
    const definition = getPlanDefinition(plan);
    assert.equal(definition.creditPeriod, 'month');
    assert.ok(definition.includedCredits > getPlanDefinition('free').includedCredits);
    assert.ok(creditCostForModel('star', plan) < creditCostForModel('star', 'free'));
  }
});

test('historical billing aliases resolve to correct entitlements', () => {
  assert.equal(normalisePlan('starter-annual'), 'starter');
  assert.equal(normalisePlan('lite'), 'plus');
  assert.equal(normalisePlan('lite-annual'), 'plus');
  assert.equal(normalisePlan('plus-annual'), 'plus');
  assert.equal(normalisePlan('pro-annual'), 'pro');
  assert.equal(normalisePlan('unknown'), null);
  assert.equal(getPlanDefinition('unknown').id, 'free');
});

test('owner entitlement remains separate from public subscriptions', () => {
  assert.equal(PLAN_DEFINITIONS.owner.includedCredits, null);
  assert.deepEqual(getPlanDefinition('owner').models, PUBLIC_TIERS);
  assert.equal(normalisePlan('owner'), null);
});

test('costs increase with model capability and never become free', () => {
  for (const plan of ['free', 'starter', 'plus', 'pro']) {
    const costs = PUBLIC_TIERS.map(model => creditCostForModel(model, plan));
    assert.ok(costs.every(cost => Number.isInteger(cost) && cost > 0));
    assert.ok(costs.every((cost, index) => index === 0 || cost > costs[index - 1]));
  }
});
