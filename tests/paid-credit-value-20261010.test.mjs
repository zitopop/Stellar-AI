import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MODEL_CREDIT_COSTS,
  PAID_MODEL_CREDIT_COSTS,
  PLAN_DEFINITIONS,
  creditCostForModel,
  modelCreditCostsForPlan,
} from '../lib/pricing.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const chat = read('api/chat.js');
const planApi = read('api/get-plan.js');
const app = read('app.html');
const plans = read('plans.html');
const models = read('models.html');
const css = read('lib/assets/stellar-credit-transparency-v1.css');

test('free trial credit costs and daily cap do not change', () => {
  assert.equal(creditCostForModel('spark', 'free'), 2);
  assert.equal(PLAN_DEFINITIONS.free.includedCredits / creditCostForModel('spark','free'), 15);
  assert.deepEqual(modelCreditCostsForPlan('free'), MODEL_CREDIT_COSTS);
});

test('paid plan model credit costs are lower with no premium tier bypass', () => {
  assert.deepEqual(PAID_MODEL_CREDIT_COSTS, {spark:2,star:4,comet:8,nova:16});
  for(const plan of ['starter','plus','pro']){
    assert.deepEqual(modelCreditCostsForPlan(plan), PAID_MODEL_CREDIT_COSTS);
    assert.equal(creditCostForModel('star',plan),4);
    assert.equal(creditCostForModel('comet',plan),8);
    assert.equal(creditCostForModel('nova',plan),16);
  }
  assert.deepEqual(PLAN_DEFINITIONS.starter.models,['spark','star']);
  assert.deepEqual(PLAN_DEFINITIONS.plus.models,['spark','star','comet']);
  assert.deepEqual(PLAN_DEFINITIONS.pro.models,['spark','star','comet','nova']);
  assert.equal(creditCostForModel('star','free'),5);
});

test('server bills by actual plan and exposes the corresponding rate table',()=>{
  assert.match(chat,/creditCostForModel\(billableTier, plan\)/);
  assert.match(chat,/refundUsageCharge\(/);
  assert.match(planApi,/modelCreditCosts: \{ \.\.\.modelCreditCostsForPlan\(plan\) \}/);
  assert.match(chat,/if \(!limits\.models\.includes\(requestedTier\)\)/);
});

test('Stellar chat shows balance and chosen model cost rather than hiding the meter',()=>{
  assert.match(app,/id="usagePill"/);
  assert.match(app,/id="composer-credit-cost"/);
  assert.match(app,/function updateCreditPreview\(\)/);
  assert.match(app,/X-Stellar-Credits-Remaining/);
  assert.match(app,/function renderUsagePanel\(\)/);
  assert.match(app,/credits remaining/);
  assert.match(css,/#usagePill\{[\s\S]*display:inline-flex!important/);
});

test('plan examples match server paid limits at the same published prices',()=>{
  for (const [plan, price] of [['starter',8],['plus',20],['pro',75]]){
    assert.ok(plans.includes('£'+price+'/month'));
    for(const key of PLAN_DEFINITIONS[plan].models){
      const count=PLAN_DEFINITIONS[plan].includedCredits/creditCostForModel(key,plan);
      assert.ok(Number.isInteger(count),plan+' '+key+' non-integer count');
    }
  }
  for(const value of ['1,250 Core','3,750 Core','1,875 Deep','7,500 Core','3,750 Deep','1,875 Max'])assert.ok(plans.includes(value),value);
  assert.match(models,/2× Fast allowance \(4 credits\)/);
  assert.match(models,/4× Fast allowance \(8 credits\)/);
  assert.match(models,/8× Fast allowance \(16 credits\)/);
});
