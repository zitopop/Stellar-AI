import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');

test('Stripe returns identify payment state and the app refreshes server truth', () => {
  assert.match(checkout, /payment=success/);
  assert.match(checkout, /payment=cancelled/);
  assert.match(checkout, /encodeURIComponent\(plan\)/);
  assert.match(app, /async function handlePaymentReturn\(\)/);
  assert.match(app, /if\(payment==='success'\)[\s\S]*?await loadPlanTruth\(\)/);
  assert.match(app, /Checkout cancelled · nothing was charged/);
});

test('credit top-up checkout remains one-time bounded and actionable', () => {
  assert.match(checkout, /if \(plan === 'topup'\)/);
  assert.match(checkout, /mode: 'payment'/);
  assert.match(checkout, /if \(!isValidTopupPence\(rawPence\)\)/);
  assert.match(app, /const CREDIT_PACKS=new Map/);
  assert.match(app, /id="topupAmount"/);
  assert.match(app, /async function startCreditCheckout\(amount\)/);
  assert.match(app, /plan:'topup',amount/);
  assert.match(app, /u\.hostname!=='checkout\.stripe\.com'/);
});

test('checkout exposes specific plan configuration failures', () => {
  for (const label of ['Starter', 'Plus', 'Pro']) assert.match(checkout, new RegExp(label + ' (monthly|annual) checkout is not configured yet'));
  assert.match(checkout, /STRIPE_PRICE_MODE_MISMATCH/);
});

test('client validates returned Stripe checkout and billing hosts', () => {
  assert.match(app, /u\.hostname!=='checkout\.stripe\.com'/);
  assert.match(app, /portalUrl\.hostname!=='billing\.stripe\.com'/);
});

test('usage UI explains automatic wallet fallback and chat opts into signed-in wallet use', () => {
  assert.match(app, /Included plan credits are used first\. Bought wallet credits take over automatically\./);
  assert.match(app, /credits\/message/);
  assert.match(app, /use_credit:Boolean\(token\(\)\)/);
});

test('owner account can still open real plan and wallet checkout for production testing', () => {
  assert.match(app, /Owner testing/);
  assert.match(app, /you can still open a real credit checkout to test production billing/);
  assert.match(app, /planCard\('Starter','£8\/mo'/);
  assert.match(app, /planCard\('Plus','£20\/mo'/);
  assert.match(app, /planCard\('Pro','£75\/mo'/);
  assert.match(app, /data-action="credit-checkout"/);
});

test('guest plan clicks persist the selected upgrade before sign-in', () => {
  assert.match(app, /function pendingUpgrade\(v=''\)/);
  assert.match(app, /sessionStorage\.setItem\('stellar-pending-upgrade',p\)/);
  assert.match(app, /pendingUpgrade\(plan\);openPanel\('settings'\)/);
  assert.match(app, /async function handlePendingIntents\(\)/);
});

test('signed-in accounts can share a server-owned referral link without a browser prompt', () => {
  assert.match(app, /id="referral-row"/);
  assert.match(app, /referralUrl=String\(data\.referralUrl\|\|''\)/);
  assert.match(app, /async function copyReferralLink\(\)/);
  assert.match(app, /async function shareReferralLink\(\)/);
  assert.match(app, /both accounts 100 bonus Stellar Credits/);
  assert.doesNotMatch(app, /window\.prompt|prompt\('Copy/);
});
