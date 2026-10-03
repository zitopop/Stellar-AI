import test from 'node:test';
import assert from 'node:assert/strict';
import {
  refundedTopupCreditDelta,
  rememberRefundedCharge,
  subscriptionHasAccess,
  subscriptionShouldRevoke,
} from '../lib/billing-lifecycle.js';

test('subscription lifecycle keeps retryable states but revokes terminal billing states', () => {
  for (const status of ['active', 'trialing', 'past_due']) assert.equal(subscriptionHasAccess(status), true);
  for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'paused']) assert.equal(subscriptionShouldRevoke(status), true);
  assert.equal(subscriptionHasAccess('unpaid'), false);
  assert.equal(subscriptionShouldRevoke('past_due'), false);
});

test('top-up refunds remove only the newly refunded share of credits', () => {
  assert.equal(refundedTopupCreditDelta({ originalPence: 1000, previousRefundedPence: 0, currentRefundedPence: 500 }), 550);
  assert.equal(refundedTopupCreditDelta({ originalPence: 1000, previousRefundedPence: 500, currentRefundedPence: 1000 }), 550);
  assert.equal(refundedTopupCreditDelta({ originalPence: 1000, previousRefundedPence: 1000, currentRefundedPence: 1000 }), 0);
});

test('refund history stays bounded and updates a charge idempotently', () => {
  let refunds = {};
  for (let i = 0; i < 25; i += 1) refunds = rememberRefundedCharge(refunds, `ch_${i}`, i * 50);
  assert.ok(Object.keys(refunds).length <= 20);
  const next = rememberRefundedCharge(refunds, 'ch_24', 1500);
  assert.equal(next.ch_24, 1500);
  assert.ok(Object.keys(next).length <= 20);
});
