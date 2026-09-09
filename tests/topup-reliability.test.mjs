import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyTopupCheckout } from '../lib/topup.js';

const appHtml = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const webhookSource = readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');

test('a paid top-up is applied once and a Stripe retry cannot double-credit it', () => {
  const first = applyTopupCheckout({ plan: 'free', walletPence: 250 }, {
    sessionId: 'cs_topup_1', amountPence: 1000, customerId: 'cus_1', now: 123,
  });
  assert.equal(first.applied, true);
  assert.equal(first.creditAdded, 1100);
  assert.equal(first.record.walletPence, 1350);
  assert.deepEqual(first.record.processedTopupSessions, ['cs_topup_1']);
  const retry = applyTopupCheckout(first.record, {
    sessionId: 'cs_topup_1', amountPence: 1000, customerId: 'cus_1', now: 456,
  });
  assert.equal(retry.applied, false);
  assert.equal(retry.reason, 'duplicate');
  assert.equal(retry.record.walletPence, 1350);
});

test('top-up state rejects invalid amounts and keeps a bounded processed-session history', () => {
  assert.equal(applyTopupCheckout({}, { sessionId: 'bad', amountPence: 525 }).applied, false);
  assert.equal(applyTopupCheckout({}, { sessionId: 'bad', amountPence: 25000 }).applied, false);
  const existing = { walletPence: 0, processedTopupSessions: Array.from({ length: 30 }, (_, i) => 'old-' + i) };
  const result = applyTopupCheckout(existing, { sessionId: 'new-one', amountPence: 500, now: 1 });
  assert.equal(result.record.processedTopupSessions.length, 20);
  assert.equal(result.record.processedTopupSessions.at(-1), 'new-one');
});

test('credit checkout UI guards duplicate submits and waits for server-confirmed balance', () => {
  for (const text of [
    'id="topup-status" class="topup-status" role="status" aria-live="polite"',
    'if (btn?.disabled) return;',
    "checkoutUrl.hostname !== 'checkout.stripe.com'",
    "sessionStorage.setItem('stellar-pending-topup'",
    'const delays = [0, 350, 700, 1200, 2000, 3200, 5000]',
    'Payment complete. Your balance is now',
    "c.setAttribute('aria-pressed', String(selected))",
  ]) assert.ok(appHtml.includes(text), text);
});

test('Stripe webhook only grants verified paid top-ups and fails closed on persistence errors', () => {
  for (const text of [
    "session.payment_status === 'paid'",
    'Number(session.amount_total) === amount',
    'if (!saved) throw new Error',
    'if (!marked) throw new Error',
  ]) assert.ok(webhookSource.includes(text), text);
});
