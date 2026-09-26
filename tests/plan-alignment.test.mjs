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
  assert.match(index, /Wallet separate from allowance/);
});

test('public model access keeps model guidance visible without mis-selling plan access', () => {
  for (const model of ['Spark','Star','Comet','Nova']) assert.match(index, new RegExp(model));
  assert.match(index, /Compare Spark, Star, Comet and Nova access across Stellar plans/);
  assert.match(index, /Start free with .*starting wallet credit and 40 included messages per hour/);
  assert.doesNotMatch(index, /Spark, Star &amp; Comet/);
});

test('pricing layout makes Plus the clear popular paid choice without hiding alternatives', () => {
  assert.match(index, /MOST POPULAR/);
  assert.match(index, /Choose Plus/);
  assert.match(index, /Pay yearly · save 30%/);
  assert.match(index, /Secure Stripe checkout/);
  assert.match(index, /Wallet credit stays separate/);
});
