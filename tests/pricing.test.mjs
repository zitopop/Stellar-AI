import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAN_DEFINITIONS, TOPUP_MAX_PENCE, TOPUP_MIN_PENCE, clampTopupPence, isValidTopupPence, normalisePlan, topupBonusPence } from '../lib/pricing.js';

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

test('top-up checkout accepts only the same 50p steps exposed by the UI', () => {
  assert.equal(isValidTopupPence(300), true);
  assert.equal(isValidTopupPence(500), true);
  assert.equal(isValidTopupPence(950), true);
  assert.equal(isValidTopupPence(1000), true);
  assert.equal(isValidTopupPence(20000), true);
  assert.equal(isValidTopupPence(49), false);
  assert.equal(isValidTopupPence(525), false);
  assert.equal(isValidTopupPence(20050), false);
  assert.equal(isValidTopupPence('500'), false);
});

test('annual and monthly prices normalize to the canonical plan access tier', () => {
  assert.equal(normalisePlan('starter'), 'starter');
  assert.equal(normalisePlan('starter-annual'), 'starter');
  assert.equal(normalisePlan('plus'), 'plus');
  assert.equal(normalisePlan('plus-annual'), 'plus');
  assert.equal(normalisePlan('lite'), 'plus');
  assert.equal(normalisePlan('lite-annual'), 'plus');
  assert.equal(normalisePlan('pro-annual'), 'pro');
  assert.equal(normalisePlan('unknown'), null);
});


test('public plan entitlements match the conversion promises', () => {
  assert.equal(PLAN_DEFINITIONS.free.includedCredits, 30);
  assert.equal(PLAN_DEFINITIONS.starter.requestsPerHour, 120);
  assert.equal(PLAN_DEFINITIONS.plus.requestsPerHour, 400);
  assert.equal(PLAN_DEFINITIONS.pro.requestsPerHour, 1600);
  assert.ok(PLAN_DEFINITIONS.pro.models.includes('nova'));
});

test('public plan pages explain monthly capacity in Fast generations', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const pricingPage = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
  for (const [tier, credits] of [['starter', 5000], ['plus', 15000], ['pro', 30000]]) {
    assert.equal(PLAN_DEFINITIONS[tier].includedCredits, credits);
    const fastGenerations = new Intl.NumberFormat('en-GB').format(credits / 2);
    const label = 'Up to ' + fastGenerations + ' Fast generations/month';
    assert.ok(home.includes(label), 'Homepage must explain ' + tier + ' capacity');
    assert.ok(pricingPage.includes(label), 'Pricing page must explain ' + tier + ' capacity');
  }
  assert.ok(pricingPage.includes('Up to 15 Fast generations/day'));
  assert.match(pricingPage, /Core, Deep and Max spend the included allowance faster/);
});
