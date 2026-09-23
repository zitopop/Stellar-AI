import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('public pricing retains all four workspace plans', () => {
  for (const plan of ['free','starter','plus','pro']) {
    assert.match(index, new RegExp('data-plan="' + plan + '"'));
  }
});

test('public pricing preserves current GBP monthly and annual prices', () => {
  for (const copy of ['£0','£8','£67/year','£20','£168/year','£75','£630/year']) assert.ok(index.includes(copy), copy);
  assert.match(index, /Prices and checkout are in GBP \(£\) worldwide/);
});

test('paid plan CTAs preserve upgrade intent into the app', () => {
  assert.match(index, /href="\/app\?upgrade=starter"/);
  assert.match(index, /href="\/app\?upgrade=plus"/);
  assert.match(index, /href="\/app\?upgrade=pro"/);
  assert.match(index, /href="\/app\?upgrade=starter-annual"/);
  assert.match(index, /href="\/app\?upgrade=plus-annual"/);
  assert.match(index, /href="\/app\?upgrade=pro-annual"/);
});

test('plan copy separates hourly allowance from wallet credit', () => {
  assert.match(index, /Wallet credit is separate from the included hourly allowance/);
});

test('public model access keeps model guidance visible without mis-selling plan access', () => {
  for (const model of ['Spark','Star','Comet','Nova']) assert.match(index, new RegExp(model));
  assert.match(index, /Compare Spark, Star, Comet and Nova access across Stellar plans/);
  assert.match(index, /Start free with .*starting credit and 40 requests per hour/);
  assert.doesNotMatch(index, /Spark, Star &amp; Comet/);
});
