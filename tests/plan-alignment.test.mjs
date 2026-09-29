import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPlanDefinition } from '../lib/pricing.js';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('public pricing retains all four workspace plans', () => {
  for (const plan of ['free','starter','plus','pro']) assert.match(index, new RegExp('data-plan="' + plan + '"'));
});

test('public pricing preserves current GBP monthly and annual prices', () => {
  for (const copy of ['£0','£8','£67/year','£20','£168/year','£75','£630/year']) assert.ok(index.includes(copy), copy);
  assert.match(index, /Prices and checkout are in GBP \(£\) worldwide/);
});

test('paid plan CTAs preserve upgrade intent into the app', () => {
  for (const plan of ['starter','plus','pro','starter-annual','plus-annual','pro-annual']) {
    assert.ok(index.includes('href="/app?upgrade=' + plan + '"'), plan);
  }
});

test('plan copy separates included allowance from wallet credit', () => {
  assert.match(index, /Wallet separate from allowance/);
  assert.match(index, /Bought credits stay on your account until used/);
});

test('public model access keeps guidance visible without hard-coding a stale free allowance', () => {
  for (const model of ['Spark','Star','Comet','Nova']) assert.match(index, new RegExp(model));
  assert.match(index, /Spark 2 · Star 5 · Comet 10 · Nova 20 credits per message/);
  const free = getPlanDefinition('free');
  assert.ok(index.includes(free.includedCredits.toLocaleString('en-GB') + ' credits/day'));
  assert.doesNotMatch(index, /Spark, Star &amp; Comet/);
});

test('pricing layout makes Plus the clear popular paid choice without hiding alternatives', () => {
  assert.match(index, /MOST POPULAR/);
  assert.match(index, /Choose Plus/);
  assert.match(index, /Pay yearly · save 30%/);
  assert.match(index, /Secure Stripe checkout/);
  assert.match(index, /Add-on credits stay separate/);
});
