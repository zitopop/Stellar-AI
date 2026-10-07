import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const plans=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');

test('landing pricing exposes a monthly/yearly billing switch',()=>{
  assert.match(home,/stellar-billing-cycle-toggle-v1/);
  assert.match(home,/data-billing-cycle="monthly"/);
  assert.match(home,/data-billing-cycle="annual"/);
  assert.match(home,/plus-annual/);
  assert.match(home,/starter-annual/);
  assert.match(home,/pro-annual/);
});

test('full plans page switches paid cards between monthly and yearly checkout',()=>{
  assert.match(plans,/stellar-plans-billing-toggle-v1/);
  for (const plan of ['starter','plus','pro']) {
    assert.match(plans,new RegExp('data-billing-plan="'+plan+'"'));
    assert.match(plans,new RegExp(plan+'-annual'));
  }
});

test('app plans panel has monthly/yearly state and annual checkout ids',()=>{
  assert.match(app,/let planBillingView='monthly'/);
  assert.match(app,/PLAN_BILLING_PRICES=/);
  assert.match(app,/data-action="plan-billing-cycle"/);
  assert.match(app,/a==='plan-billing-cycle'/);
  assert.match(app,/checkoutPlan=plan\?\(yearly\?plan\+'-annual':plan\):''/);
});
