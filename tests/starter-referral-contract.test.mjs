import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PLAN_DEFINITIONS, getPlanDefinition, normalisePlan } from '../lib/pricing.js';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const chat = read('api/chat.js');
const checkout = read('api/create-checkout.js');
const auth = read('lib/auth.js');
const profile = read('lib/profile.js');
const usage = read('lib/usage.js');
const app = read('app.html');
const getPlan = read('api/get-plan.js');

test('canonical plan definitions expose the requested hourly limits and Pro-only Nova tier', () => {
  assert.equal(PLAN_DEFINITIONS.free.requestsPerHour, 40);
  assert.equal(PLAN_DEFINITIONS.starter.requestsPerHour, 120);
  assert.equal(PLAN_DEFINITIONS.plus.requestsPerHour, 400);
  assert.equal(PLAN_DEFINITIONS.pro.requestsPerHour, 1600);
  assert.equal(getPlanDefinition('starter').name, 'Starter');
  assert.equal(getPlanDefinition('starter').maxTokens, 3500);
  assert.equal(getPlanDefinition('pro').models.includes('nova'), true);
  assert.equal(getPlanDefinition('plus').models.includes('nova'), false);
  assert.equal(normalisePlan('lite'), 'plus');
});

test('chat keeps all requested legacy aliases safely mapped and uses atomic server-side hourly usage', () => {
  assert.match(chat, /fabie:\s*'claude-haiku-4-5-20251001'/);
  assert.match(chat, /smart:\s*'claude-sonnet-4-6'/);
  assert.match(chat, /ultra:\s*'claude-opus-4-8'/);
  assert.match(chat, /claude-haiku-4-5-20251001/);
  assert.match(chat, /claude-sonnet-4-6/);
  assert.match(chat, /claude-opus-4-8/);
  assert.match(chat, /consumeUsage\(/);
  assert.match(usage, /\['INCR', key\]/);
  assert.match(usage, /\['EXPIRE', key, seconds, 'NX'\]/);
});

test('checkout, auth and account contracts preserve Starter, founders and referral safety', () => {
  assert.match(checkout, /STRIPE_PRICE_ID_STARTER/);
  assert.match(checkout, /STRIPE_PRICE_ID_STARTER_ANNUAL/);
  assert.match(auth, /deadlyfox10@gmail\.com/);
  assert.match(auth, /tobi@trystellarai\.com/);
  assert.match(profile, /stellar:referral:email:/);
  assert.match(profile, /REFERRAL_REWARD_PENCE = 100/);
  assert.match(profile, /referrerEmail === email/);
  assert.match(getPlan, /referralUrl/);
  assert.match(getPlan, /achievementDefinitions/);
});

test('app Starter card preserves the approved early-builder offer and benefit order', () => {
  assert.match(app, /id="plan-card-starter"[\s\S]*?Early builders who want more room for regular scripts\.[\s\S]*?id="plan-btn-starter"[^>]*>Get Starter<\/button>[\s\S]*?£67\/year · Save 30%[\s\S]*?Everything in Free, plus[\s\S]*?3× usage · 120 requests\/hour[\s\S]*?Priority queue[\s\S]*?Longer scripts[\s\S]*?Cancel anytime/);
});

test('workspace defaults to Star and protects its mobile modal experience', () => {
  assert.match(app, /s\.model \|\| 'smart'/);
  assert.match(app, /#plans-modal > div,[\s\S]*?max-height: 92dvh !important;[\s\S]*?-webkit-overflow-scrolling: touch !important;/);
  assert.match(app, /\.modal-x \{[\s\S]*?width: 44px !important;[\s\S]*?height: 44px !important;/);
  assert.match(app, /body\.modal-active #rec-btn \{ display: none !important; \}/);
  assert.match(app, /body:has\(\[id\$="-modal"\]:not\(\.hidden\)\) #rec-btn \{ display: none !important; \}/);
});
