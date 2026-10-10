import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanDefinition, MODEL_CREDIT_COSTS } from '../lib/pricing.js';

const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const free = plans.split('<article class="plan" data-plan="free">')[1]
  ?.split('<article class="plan paid" data-plan="starter"')[0] || '';

test('Free plan does not advertise paid models or Jarvis Pro entitlements', () => {
  assert.ok(free.includes('Up to 15 Fast generations/day'));
  assert.match(free, /1,800 output tokens/);
  assert.doesNotMatch(free, /Stellar (Core|Deep|Max)|Everything in Plus|1,600 requests\/hour|Jarvis/i);
});

test('paid Fast-equivalent allowances match server-owned billing definitions', () => {
  const expected = { starter: 2500, plus: 7500, pro: 15000 };
  for (const [plan, generations] of Object.entries(expected)) {
    const definition = getPlanDefinition(plan);
    assert.equal(definition.includedCredits / MODEL_CREDIT_COSTS.spark, generations);
    const number = generations.toLocaleString('en-GB');
    assert.match(plans, new RegExp('Up to ' + number + ' Fast generations/month'));
    assert.ok(landing.includes('Up to ' + number + ' Fast-equivalent generations/month'), plan);
  }
  assert.match(plans, /Core, Deep and Max use more allowance/);
  assert.match(landing, /hourly limits apply/i);
});

test('every paid plan offers monthly and annual checkout choices without JavaScript', () => {
  for (const [plan, monthly, annual] of [['starter','£8','£67'], ['plus','£20','£168'], ['pro','£75','£630']]) {
    assert.ok(plans.includes('href="/app?upgrade=' + plan + '"'));
    assert.ok(plans.includes('href="/app?upgrade=' + plan + '-annual">Choose yearly · ' + annual + '/yr'));
    assert.ok(plans.includes('Choose ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' · ' + monthly + '/mo'));
  }
  assert.match(plans, /if\(alternate\)\{alternate\.hidden=false;/);
  assert.match(plans, /data-billing-cycle="annual"/);
});

test('landing keeps one clear heading, free CTA and full pricing route', () => {
  assert.equal((landing.match(/<h1\b/g) || []).length, 1);
  assert.match(landing, /Your ideas\. Real work\. One powerful AI\./);
  assert.match(landing, /data-conversion="start-free"/);
  assert.match(landing, /href="\/plans"/);
});

test('pricing metadata remains intact and does not leak escaped newlines', () => {
  const head = plans.split('</head>')[0];
  assert.doesNotMatch(head, /\\n<link/i);
  assert.match(head, /stellar-clean-premium-v35\.css/);
  assert.match(head, /stellar-brand-system-v1\.css/);
});
