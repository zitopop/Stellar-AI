import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_CREDIT_COSTS, PLAN_DEFINITIONS } from '../lib/pricing.js';

const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const count = (plan, model) =>
  (PLAN_DEFINITIONS[plan].includedCredits / MODEL_CREDIT_COSTS[model])
    .toLocaleString('en-GB');

test('pricing explains the real tier allowances rather than invented benefits', () => {
  assert.match(plans, /What does your monthly allowance buy\?/);
  assert.match(plans, /only one model/);
  for (const [plan, displayName, price, modelCounts] of [
    ['starter', 'Starter', 8, ['spark', 'star']],
    ['plus', 'Plus', 20, ['spark', 'star', 'comet']],
    ['pro', 'Pro', 75, ['spark', 'star', 'comet', 'nova']],
  ]) {
    assert.match(plans, new RegExp(displayName + ' · £' + price + '/month'));
    for (const model of modelCounts) {
      assert.ok(plans.includes('<b>' + count(plan, model) + ' ' + ({
        spark:'Fast', star:'Core', comet:'Deep', nova:'Max'
      })[model] + '</b>'), plan + ' ' + model + ' limit needs to match backend');
    }
  }
  assert.match(plans, /Hourl[y] request ceiling<\/th><td>30 requests/);
  assert.match(plans, /They are not separate pools of messages/);
  assert.doesNotMatch(plans, /Instant access • Cancel anytime/);
});

test('billing cycle selectors and actual Stripe plan routes remain unchanged', () => {
  for (const [plan, month, annual] of [
    ['starter', 8, 67], ['plus', 20, 168], ['pro', 75, 630],
  ]) {
    assert.ok(plans.includes('/app?upgrade=' + plan + '"'));
    assert.ok(plans.includes('/app?upgrade=' + plan + '-annual"'));
    assert.ok(plans.includes('£' + month));
    assert.ok(plans.includes('£' + annual));
  }
  assert.match(plans, /Manage or cancel auto-renewal from billing settings/);
});

test('the in-app upgrade path respects budgets and offers a choice', () => {
  assert.match(app, /free:\{id:'starter',name:'Starter',price:'£8\/month'/);
  assert.match(app, /Compare all plans and limits/);
  assert.match(app, /30 requests\/hour ceiling/);
  assert.match(app, /1,500 Max messages\/month/);
  assert.doesNotMatch(app, /Instant access • Cancel anytime/);
});

test('homepage reflects actual free hourly rate and links to full model details', () => {
  assert.match(homepage, /Up to 30 requests\/hour and 15 Fast\/day/);
  assert.match(homepage, /Compare exact model allowances and plan limits/);
  assert.match(homepage, /shared Fast-equivalent allowance/);
});

test('plan finder offers real editable example prompts before checkout', () => {
  assert.match(plans, /id="match-plan-preview"/);
  assert.match(plans, /Preview tasks work with Free too/);
  assert.match(plans, /preview.href='\/app\?prompt='/);
  for (const plan of ['free', 'starter', 'plus', 'pro']) {
    assert.ok(plans.includes('plan-sample-'), 'sample campaign must be traceable');
    assert.ok(plans.includes(plan + ':{name:'), 'each plan is in the sample catalog');
  }
  const script = plans.match(/<script id="stellar-plan-fit-guide-js-v1">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});
