import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { subscriptionPreventsNewCheckout } from '../api/create-checkout.js';

const source = readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('cancelled or expired initial subscriptions do not permanently lock checkout', () => {
  for (const status of ['canceled', 'incomplete_expired']) {
    assert.equal(subscriptionPreventsNewCheckout(status), false, status);
  }
});

test('other subscription states still block duplicate recurring charges', () => {
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused', 'unknown', '']) {
    assert.equal(subscriptionPreventsNewCheckout(status), true, status);
  }
});

test('checkout verifies Stripe state instead of trusting stale local entitlements', () => {
  assert.match(source, /stripe\.subscriptions\.retrieve\(existingSubscriptionId\)/);
  assert.match(source, /subscriptionPreventsNewCheckout\(existingSubscription\.status\)/);
  assert.match(source, /error\?\.code !== 'resource_missing'/);
  assert.match(source, /code: 'ACTIVE_SUBSCRIPTION_EXISTS'/);
  assert.match(source, /manageBilling: true/);
  assert.doesNotMatch(source, /if \(isPaidPlan\(accountUser\?\.plan\) && \/\^sub_/);
});
