import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('AI business website builder is visibly priced and locked by default', () => {
  const html = read('business-builder.html');
  assert.match(html, /£99 one-time/);
  assert.match(html, /id="builder-paywall"/);
  assert.match(html, /class="form locked"/);
  assert.match(html, /Buy package · £99/);
  assert.match(html, /plan:'website-builder'/);
  assert.match(html, /\/api\/get-plan/);
});

test('website builder checkout is a server-created £99 one-time Stripe payment', () => {
  const checkout = read('api/create-checkout.js');
  assert.match(checkout, /plan === 'website-builder'/);
  assert.match(checkout, /mode: 'payment'/);
  assert.match(checkout, /unit_amount: 9900/);
  assert.match(checkout, /Stellar AI Business Website Package/);
  assert.match(checkout, /business-builder\?payment=success/);
  assert.match(checkout, /payment_intent_data/);
});

test('verified Stripe webhook grants and reversals revoke website builder entitlement', () => {
  const webhook = read('api/webhook.js');
  assert.match(webhook, /checkoutPlan === 'website-builder'/);
  assert.match(webhook, /session\.payment_status === 'paid'/);
  assert.match(webhook, /session\.amount_total\) === 9900/);
  assert.match(webhook, /stellar:website-builder:/);
  assert.match(webhook, /status: 'active'/);
  assert.match(webhook, /event\.type === 'charge\.refunded'/);
  assert.match(webhook, /status: 'refunded'/);
  assert.match(webhook, /status: 'disputed'/);
});

test('AI API rejects unpaid builder calls server-side', () => {
  const chat = read('api/chat.js');
  assert.match(chat, /websiteBuilderRequest/);
  assert.match(chat, /stellar:website-builder:/);
  assert.match(chat, /res\.status\(402\)/);
  assert.match(chat, /WEBSITE_BUILDER_PAYMENT_REQUIRED/);
});

test('existing account API exposes paid builder entitlement without adding another Vercel function', () => {
  const plan = read('api/get-plan.js');
  assert.match(plan, /requireSession/);
  assert.match(plan, /stellar:website-builder:/);
  assert.match(plan, /websiteBuilder/);
  assert.match(plan, /pricePence: 9900/);
});
