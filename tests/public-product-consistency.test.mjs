import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('public buyer pages use the current usage model',()=>{
  const share=read('share-stellar-earn-credits/index.html');
  const money=read('money-ready/index.html');
  const car=read('qbcore-car-dealer-script/index.html');
  assert.doesNotMatch(share,/earn credits|credit-award backend|bigger credit bonus/i);
  assert.doesNotMatch(money,/buy credits|monthly credits|wallet credits|credits sync/i);
  assert.match(money,/Clear usage meter/);
  assert.match(car,/>See plans<\/a>/);
});

test('mobile plan cards keep their features visible',()=>{
  const plans=read('plans.html');
  assert.doesNotMatch(plans,/@media\(max-width:700px\)[\s\S]*?\.features\{display:none\}/);
  assert.match(plans,/stellar-plans-mobile-clarity-v38/);
  assert.match(plans,/\.features\{display:grid!important/);
  assert.match(plans,/\.actions \.btn\{min-height:46px!important/);
});
