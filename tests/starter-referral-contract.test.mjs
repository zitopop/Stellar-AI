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

test('successful-generation records require a completed stream', () => {
  assert.match(chat, /let streamCompleted = false;/);
  assert.match(chat, /res\.end\(\);\s+streamCompleted = true;/);
  assert.match(chat, /if \(streamCompleted && session\?\.email && KV_URL && KV_TOKEN\) \{\s+recordScriptGenerated/);
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

test('achievement progression remains server-side while the removed Skill Tree leaves no UI hooks', () => {
  for (const achievement of ['hundred-scripts', 'return-builder', 'referral-builder']) assert.match(profile, new RegExp(`'${achievement}'`));
  assert.match(profile, /count >= 100/);
  assert.match(profile, /startsNewSession && Number\(prior\.sessionCount\) >= 1/);
  assert.match(profile, /const achievements = \{ \.\.\.\(user\.achievements \|\| \{\}\) \};/);
  assert.match(profile, /'referral-builder': now/);
  assert.doesNotMatch(app, /function renderSkillTree\(/);
  assert.doesNotMatch(app, /renderSkillTree\(/);
  assert.doesNotMatch(app, /id="set-skill-tree-section"/);
  assert.doesNotMatch(app, /id="set-skill-tree"/);
  assert.doesNotMatch(app, /class="skill-tree/);
  assert.doesNotMatch(app, /id="set-motivation"/);
  assert.doesNotMatch(app, /id="set-achievements-section"/);
  assert.doesNotMatch(app, /class="achievement-badge/);
});

test('Starter checkout is routed through the current authenticated upgrade handoff', () => {
  assert.match(app, /const UPGRADE_PLANS=new Set\(\['starter','plus','pro','starter-annual','plus-annual','pro-annual'\]\)/);
  assert.match(app, /async function startPlanCheckout\(plan\)/);
  assert.match(app, /JSON\.stringify\(\{plan:normalized\}\)/);
  assert.match(app, /checkoutUrl\.hostname!=='checkout\.stripe\.com'/);
});

test('workspace defaults to Star and protects current mobile surfaces', () => {
  assert.match(app, /const selectedModel=Store\.get\('selectedModel','star'\)/);
  assert.match(app, /id="current-model-label">Star · balanced/);
  assert.match(app, /@media \(max-width: 520px\)[\s\S]*?max-height:90dvh/);
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.composer-tool\{min-height:44px\}/);
  assert.match(app, /#model-menu\{[\s\S]*?overflow:auto/);
});
