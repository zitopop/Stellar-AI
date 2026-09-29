import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanDefinition } from '../lib/pricing.js';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const fmt = (n) => Number(n).toLocaleString('en-GB');

test('public plan ladder makes paid plans clearly stronger than Free', () => {
  const free = getPlanDefinition('free');
  const starter = getPlanDefinition('starter');
  const plus = getPlanDefinition('plus');
  const pro = getPlanDefinition('pro');

  assert.equal(free.creditPeriod, 'day');
  assert.equal(starter.creditPeriod, 'month');
  assert.equal(plus.creditPeriod, 'month');
  assert.equal(pro.creditPeriod, 'month');
  assert.ok(free.includedCredits > 0);
  assert.ok(free.includedCredits * 31 < starter.includedCredits, 'Free monthly equivalent must stay below Starter');
  assert.ok(starter.includedCredits < plus.includedCredits);
  assert.ok(plus.includedCredits < pro.includedCredits);
});

test('public pricing surfaces agree with server-owned allowances', () => {
  const plans = read('plans.html');
  const terms = read('terms.html');
  const llms = read('llms.txt');
  const guide = read('what-is-what.html');
  const index = read('index.html');
  const homepageJs = read('lib/assets/homepage.js');
  const defs = ['free','starter','plus','pro'].map(id => getPlanDefinition(id));

  for (const source of [plans, terms, llms, guide]) {
    for (const def of defs) {
      const n = fmt(def.includedCredits).replace(/,/g, ',');
      const period = def.creditPeriod === 'day' ? 'day' : 'month';
      assert.match(source, new RegExp(n.replace(',', ',') + '(?: credits)?(?:\\/| per )' + period), def.id + ' allowance');
    }
  }

  for (const def of defs) {
    const period = def.creditPeriod === 'day' ? 'day' : 'month';
    assert.ok(index.includes(fmt(def.includedCredits) + ' credits/' + period), def.id);
  }
  assert.doesNotMatch(homepageJs, /pricingReplacements/);
});
