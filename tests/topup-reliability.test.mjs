import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyTopupCheckout } from '../lib/topup.js';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const webhook = readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');

test('a paid top-up is applied once and retry cannot double-credit it', () => {
  const first = applyTopupCheckout({ plan: 'free', walletPence: 250 }, { sessionId: 'cs_topup_1', amountPence: 1000, customerId: 'cus_1', now: 123 });
  assert.equal(first.applied, true);
  assert.equal(first.record.walletPence, 1350);
  const retry = applyTopupCheckout(first.record, { sessionId: 'cs_topup_1', amountPence: 1000, customerId: 'cus_1', now: 456 });
  assert.equal(retry.applied, false);
  assert.equal(retry.record.walletPence, 1350);
});

test('credit checkout uses Stripe-host validation, keeps pending intent and refreshes server truth on return', () => {
  assert.match(app, /async function startCreditCheckout\(amount\)/);
  assert.match(app, /u\.hostname!=='checkout\.stripe\.com'/);
  assert.match(app, /stellar-pending-credit-pack/);
  assert.match(app, /async function handlePaymentReturn\(\)[\s\S]*?await loadPlanTruth\(\)/);
  assert.match(webhook, /applyTopupCheckout/);
});
