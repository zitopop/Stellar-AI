import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyTopupCheckout } from '../lib/topup.js';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const webhook = readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');

test('a paid top-up is applied once and Stripe retry cannot double-credit it', () => {
  const first = applyTopupCheckout({ plan: 'free', walletPence: 250 }, {
    sessionId: 'cs_topup_1', amountPence: 1000, customerId: 'cus_1', now: 123,
  });
  assert.equal(first.applied, true);
  assert.equal(first.record.walletPence, 1250);
  const retry = applyTopupCheckout(first.record, {
    sessionId: 'cs_topup_1', amountPence: 1000, customerId: 'cus_1', now: 456,
  });
  assert.equal(retry.applied, false);
  assert.equal(retry.record.walletPence, 1250);
});

test('credit checkout UI prevents duplicate submits and validates Stripe host', () => {
  assert.match(app, /id="topup-buy"[^>]*onclick="startCreditCheckout\(\)"/);
  assert.match(app, /if\(button\?\.disabled\)return/);
  assert.match(app, /button\.disabled=true/);
  assert.match(app, /checkoutUrl\.hostname!=='checkout\.stripe\.com'/);
  assert.match(app, /stellar-pending-topup/);
  assert.match(app, /id="topup-status"[^>]*aria-live="polite"/);
});

test('payment return refreshes server-confirmed wallet state instead of guessing', () => {
  assert.match(app, /async function handlePaymentReturn\(\)/);
  assert.match(app, /await loadPlanTruth\(\)/);
  assert.match(app, /Number\(planState\.walletPence\|\|0\)>before/);
  assert.match(app, /Payment completed\. Wallet credit is still syncing\./);
});

test('Stripe webhook grants verified paid top-ups through shared idempotent helper', () => {
  assert.match(webhook, /applyTopupCheckout/);
  assert.match(webhook, /checkout\.session\.completed/);
});
