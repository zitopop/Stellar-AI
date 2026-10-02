import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAN_DEFINITIONS } from '../lib/pricing.js';

const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
const terms = fs.readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const acceptableUse = fs.readFileSync(new URL('../acceptable-use.html', import.meta.url), 'utf8');
const plans = fs.readFileSync(new URL('../plans.html', import.meta.url), 'utf8');

test('checkout reuses open sessions and verifies the Stripe session on return', () => {
  assert.match(checkout, /reusableOpenCheckout/);
  assert.match(checkout, /stripe\.checkout\.sessions\.retrieve\(sessionId\)/);
  assert.match(checkout, /action === 'confirm-checkout'/);
  assert.match(checkout, /checkoutEmail !== signedInEmail/);
  assert.match(checkout, /checkout\?\.status !== 'complete'/);
  assert.match(checkout, /\['paid', 'no_payment_required'\]/);
  assert.match(checkout, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(app, /action:'confirm-checkout',sessionId/);
});

test('moment-of-value gates are enforced server-side and opened in the app', () => {
  assert.match(chat, /code: 'PAYWALL_REQUIRED'/);
  assert.match(chat, /reason: 'premium_model'/);
  assert.match(chat, /reason: 'free_allowance_exhausted'/);
  assert.match(chat, /return res\.status\(402\)/);
  assert.match(app, /err\?\.code==='PAYWALL_REQUIRED'/);
  assert.match(app, /openPanel\('plans'\)/);
});

test('customer model capabilities use Stellar tier names only', () => {
  const allowed = new Set(['spark', 'star', 'comet', 'nova']);
  for (const definition of Object.values(PLAN_DEFINITIONS)) {
    for (const model of definition.models) {
      assert.ok(allowed.has(model), `public capability leaked provider model: ${model}`);
    }
  }

  const publicInputs = chat.slice(
    chat.indexOf('const PUBLIC_MODEL_INPUTS'),
    chat.indexOf('const OWNER_ONLY_ROLES')
  );
  assert.doesNotMatch(publicInputs, /gpt-|claude-|gemini-|grok-/i);

  const browserCosts = app.match(/const COSTS=\{[^}]+\}/)?.[0] || '';
  assert.doesNotMatch(browserCosts, /gpt-|claude-|gemini-|grok-/i);
});

test('paid upgrade surfaces show the buyer-confidence message', () => {
  assert.match(app, /Instant access • Cancel anytime/);
  assert.match(plans, /Choose Plus[\s\S]{0,400}Instant access • Cancel anytime/);
  assert.doesNotMatch(plans, /Start free<\/a><\/div><span class="checkout-trust">/);
});

test('legal pages state copyright, licensing and trademark safeguards without promising originality', () => {
  assert.match(terms, /Only upload, request, publish or distribute material that you own, are licensed to use/);
  assert.match(terms, /third-party names, trademarks and product marks belong to their respective owners/i);
  assert.match(acceptableUse, /Generated output is not guaranteed to be unique, original or free of third-party rights/);
  assert.match(acceptableUse, /required copyright, licence or attribution notices/);
  assert.match(acceptableUse, /support@trystellarai\.com/);
});
