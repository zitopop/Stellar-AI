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
const serverPass = fs.readFileSync(new URL('../server-pass.html', import.meta.url), 'utf8');
const webhook = fs.readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');

test('Stripe return-path access is verified before provisioning', () => {
  assert.match(checkout, /stripe\.checkout\.sessions\.retrieve\(id\)/);
  assert.match(checkout, /action === 'confirm-checkout'/);
  assert.match(checkout, /checkoutEmail !== signedInEmail/);
  assert.match(checkout, /checkout\?\.metadata\?\.app !== 'stellar-ai'/);
  assert.match(checkout, /checkout\?\.mode !== 'subscription'/);
  assert.match(checkout, /checkout\?\.status !== 'complete'/);
  assert.match(checkout, /\['paid', 'no_payment_required'\]/);
  assert.match(checkout, /stripe\.subscriptions\.retrieve\(subscriptionId\)/);
  assert.match(checkout, /\['active', 'trialing'\]/);
  assert.match(checkout, /subscriptionCustomerId !== checkoutCustomerId/);
  assert.match(checkout, /subscriptionPriceForPlan\(rawPlan, process\.env, 'GBP'\)/);
  assert.match(checkout, /Number\(existing\.planCreditAnchorAt\) \|\| Date\.now\(\)/);
  assert.match(checkout, /session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(checkout, /metadata: \{ app: 'stellar-ai', email: sessionUser\.email, plan/);
  assert.match(checkout, /liveSubscriptionPriceForPlan\(rawPlan, 'GBP'\) \|\| subscriptionPriceForPlan/);
  assert.match(app, /action:'confirm-checkout',sessionId/);
});

test('moment-of-value paywalls are enforced on the server and handled in the app', () => {
  assert.match(chat, /code: 'PAYWALL_REQUIRED'/);
  assert.match(chat, /reason: 'premium_model'/);
  assert.match(chat, /reason: 'free_allowance_exhausted'/);
  assert.match(chat, /return res\.status\(402\)/);
  assert.match(app, /err\?\.code==='PAYWALL_REQUIRED'/);
  assert.match(app, /openPanel\('plans'\)/);
  assert.match(app, /upgrade-from-multifile-download/);
  assert.match(app, /downloadableCount>1/);
  assert.match(app, /Full multi-file downloads are included with Starter, Plus or Pro/);
});

test('customer capability surfaces expose Stellar tier names only', () => {
  const allowed = new Set(['spark', 'star', 'comet', 'nova']);
  for (const definition of Object.values(PLAN_DEFINITIONS)) {
    for (const model of definition.models) {
      assert.ok(allowed.has(model), `provider model leaked through plan capability: ${model}`);
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

test('paid self-serve plans show checkout reassurance but Free and Server Pass do not', () => {
  assert.match(app, /Instant access • Cancel anytime/);
  assert.match(plans, /Choose Plus[\s\S]{0,300}Instant access • Cancel anytime/);

  const freeSegment = plans.slice(plans.indexOf('<h2>Free</h2>'), plans.indexOf('<h2>Starter</h2>'));
  assert.doesNotMatch(freeSegment, /checkout-trust/);

  const serverStart = plans.indexOf('<strong>Server Pass<\/strong>');
  const serverEnd = plans.indexOf('<\/article>', serverStart);
  assert.ok(serverStart >= 0 && serverEnd > serverStart);
  assert.doesNotMatch(plans.slice(serverStart, serverEnd), /checkout-trust/);
});

test('legal text requires licence review and avoids guaranteeing originality', () => {
  assert.match(terms, /Only upload, request, publish or distribute material that you own, are licensed to use/);
  assert.match(terms, /third-party names, trademarks and product marks belong to their respective owners/i);
  assert.match(acceptableUse, /generated output is not guaranteed to be unique, original or free of third-party rights/i);
  assert.match(acceptableUse, /attribution, copyright or licence notices/i);
});


test('Server Pass has a real recurring checkout without overwriting personal plan entitlements', () => {
  assert.match(checkout, /plan === 'server-pass'/);
  assert.match(checkout, /unit_amount: 5000/);
  assert.match(checkout, /recurring: \{ interval: 'month', interval_count: 1 \}/);
  assert.match(checkout, /payment_method_types: \['card'\]/);
  assert.match(checkout, /phone_number_collection: \{ enabled: false \}/);
  assert.match(checkout, /server-pass\?payment=success&session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(app, /'server-pass'/);
  assert.match(serverPass, /Buy Server Pass/);
  assert.match(webhook, /stellar:server-pass:/);
  assert.match(webhook, /pending_activation/);
  assert.match(webhook, /subscription\.metadata\?\.plan \|\| ''\)\.toLowerCase\(\) === 'server-pass'/);
});

test('Terms explicitly avoid promising copyright or infringement clearance', () => {
  assert.match(terms, /not guaranteed to be unique, original, non-infringing or suitable for a particular commercial use/i);
  assert.match(terms, /check relevant third-party licences, platform rules and rights/i);
});


test('plan entitlements enforce hourly limits and public model ladder server-side', () => {
  assert.equal(PLAN_DEFINITIONS.free.requestsPerHour, 30);
  assert.equal(PLAN_DEFINITIONS.starter.requestsPerHour, 120);
  assert.equal(PLAN_DEFINITIONS.plus.requestsPerHour, 400);
  assert.equal(PLAN_DEFINITIONS.pro.requestsPerHour, 1600);
  assert.deepEqual(PLAN_DEFINITIONS.free.models, ['spark']);
  assert.ok(PLAN_DEFINITIONS.plus.models.includes('comet'));
  assert.ok(PLAN_DEFINITIONS.pro.models.includes('nova'));
  assert.match(chat, /consumeHourlyRequest/);
  assert.match(chat, /hourly_request_limit/);
  assert.match(chat, /X-Stellar-RateLimit-Limit/);
  assert.match(chat, /Math\.min\(Math\.floor\(requestedMaxTokens\), limits\.maxTokens\)/);
});

test('Stripe webhooks claim events atomically and release failed claims', () => {
  assert.match(webhook, /\['SET', key, JSON\.stringify\(value\), 'EX', seconds, 'NX'\]/);
  assert.match(webhook, /state: 'processing'/);
  assert.match(webhook, /state: 'completed'/);
  assert.match(webhook, /await kvDelete\(eventKey\(event\.id\)\)/);
  assert.match(webhook, /missing customer or subscription identifiers/);
});

test('mobile workspace wraps code, keeps 44px actions, and surfaces rate-limit timeouts', () => {
  assert.match(app, /\.code-export-button\{min-height:44px/);
  assert.match(app, /white-space:pre-wrap!important/);
  assert.match(app, /showToast\(message,'warn'\)/);
  assert.match(app, /err\?\.code==='RATE_LIMITED'/);
  assert.match(app, /err\?\.code==='GENERATION_TIMEOUT'/);
});


test('Server Pass renewal failures stay isolated from personal plan billing', () => {
  assert.match(webhook, /invoiceSubscriptionPlan === 'server-pass'/);
  assert.match(webhook, /stellar:server-pass:\$\{email\}/);
  assert.match(webhook, /Could not persist Server Pass invoice failure/);
  assert.match(webhook, /status: finalRevoke \? 'inactive' : \(existingPass\.guildId \? 'active' : 'pending_activation'\)/);
  assert.match(checkout, /serverPassUser\?\.checkoutSessionId/);
  assert.match(checkout, /A paid Stellar plan or Server Pass is required to manage subscription billing/);
});
