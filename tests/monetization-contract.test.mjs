import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('Stripe returns identify payment state and purchased plan', () => {
  assert.match(checkout, /payment=success/);
  assert.match(checkout, /payment=cancelled/);
  assert.match(checkout, /encodeURIComponent\(plan\)/);
  assert.match(app, /async function handlePaymentReturn\(\)/);
});

test('credit top-up checkout remains one-time bounded and actionable', () => {
  assert.match(checkout, /if \(plan === 'topup'\)/);
  assert.match(checkout, /mode: 'payment'/);
  assert.match(checkout, /if \(!isValidTopupPence\(rawPence\)\)/);
  assert.match(app, /id="topup-amount"/);
  assert.match(app, /Choose a valid amount between £10 and £200\./);
  assert.match(app, /Credit checkout could not start\./);
  assert.match(app, /Could not reach credit checkout\./);
});

test('checkout exposes specific plan configuration failures', () => {
  for (const label of ['Starter', 'Plus', 'Pro']) {
    assert.match(checkout, new RegExp(label + ' (monthly|annual) checkout is not configured yet'));
  }
  assert.match(checkout, /STRIPE_PRICE_MODE_MISMATCH/);
});

test('client validates returned Stripe checkout and billing hosts', () => {
  assert.match(app, /checkoutUrl\.hostname!=='checkout\.stripe\.com'/);
  assert.match(app, /portalUrl\.hostname!=='billing\.stripe\.com'/);
});

test('usage UI separates included allowance from optional spendable credit', () => {
  assert.match(app, /Use wallet credit after included allowance/);
  assert.match(app, /Credit does not raise your hourly limit/);
  assert.match(app, /use_credit:creditsOn\(\)/);
});

test('owner accounts can open plan and wallet checkout for production testing', () => {
  assert.doesNotMatch(app, /Owner access already includes the full workspace\./);
  assert.doesNotMatch(app, /topup\.hidden=isOwner\(\)/);
  assert.match(app, /onclick="startPlanCheckout\('starter'\)"/);
  assert.match(app, /onclick="startPlanCheckout\('plus'\)"/);
  assert.match(app, /onclick="startPlanCheckout\('pro'\)"/);
  assert.match(app, /onclick="startCreditCheckout\(\)"/);
});


test('guest plan clicks save the selected upgrade before sign-in', () => {
  assert.match(app, /function savePendingUpgrade\(plan\)/);
  assert.match(app, /pendingUpgradeIntent\(normalized\)/);
  assert.match(app, /then Stripe checkout will open for/);
});
