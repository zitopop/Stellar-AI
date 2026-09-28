import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanDefinition } from '../lib/pricing.js';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('public plan ladder makes paid plans clearly stronger than Free', () => {
  const free = getPlanDefinition('free');
  const starter = getPlanDefinition('starter');
  const plus = getPlanDefinition('plus');
  const pro = getPlanDefinition('pro');

  assert.equal(free.includedCredits, 75);
  assert.equal(free.creditPeriod, 'day');
  assert.equal(starter.includedCredits, 5000);
  assert.equal(plus.includedCredits, 15000);
  assert.equal(pro.includedCredits, 50000);
  assert.ok(free.includedCredits * 31 < starter.includedCredits, 'Free monthly equivalent must stay below Starter');
  assert.ok(starter.includedCredits < plus.includedCredits);
  assert.ok(plus.includedCredits < pro.includedCredits);
});

test('public pricing surfaces show the new conversion ladder', () => {
  const plans = read('plans.html');
  const terms = read('terms.html');
  const llms = read('llms.txt');
  const guide = read('what-is-what.html');
  const index = read('index.html');
  const homepageJs = read('lib/assets/homepage.js');

  for (const source of [plans, terms, llms, guide]) {
    assert.match(source, /75 (?:credits\/day|credits per day|credits\/day|\/day|day)/);
    assert.match(source, /5,000 (?:credits\/month|credits per month|monthly credits|\/month|month)/);
    assert.match(source, /15,000 (?:credits \+ Comet|credits\/month|credits per month|\/month|month)/);
    assert.match(source, /50,000 (?:credits \+ Nova|credits\/month|credits per month|\/month|month)/);
    assert.doesNotMatch(source, /1,500 credits\/(?:month|mo)|1,500 credits per month/);
    assert.doesNotMatch(source, /20,000 credits\/(?:month|mo)|20,000 credits per month/);
  }

  assert.match(index, /75 credits\/day/);
  assert.match(index, /5,000 credits\/month/);
  assert.match(index, /15,000 credits\/month/);
  assert.match(index, /50,000 credits\/month/);
  assert.doesNotMatch(homepageJs, /pricingReplacements/);
});
