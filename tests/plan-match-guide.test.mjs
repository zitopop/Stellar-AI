import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAN_DEFINITIONS, MODEL_CREDIT_COSTS } from '../lib/pricing.js';

const page = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');

test('plan finder offers all current tiers with accessible controls', () => {
  assert.match(page, /Not sure which plan to choose\?/);
  assert.match(page, /aria-live="polite"/);
  for (const plan of ['free', 'starter', 'plus', 'pro']) {
    assert.ok(page.includes('data-match-plan="' + plan + '"'));
  }
  assert.ok(page.includes("'\/app?upgrade='+selected+(annual?'-annual':'')"));
});

test('suggested plans match real monthly and annual pricing and usage', () => {
  for (const [plan, monthly, annual] of [['starter', '£8', '£67'], ['plus', '£20', '£168'], ['pro', '£75', '£630']]) {
    assert.ok(page.includes("month:'" + monthly + "'"));
    assert.ok(page.includes("year:'" + annual + "'"));
    const generations = PLAN_DEFINITIONS[plan].includedCredits / MODEL_CREDIT_COSTS.spark;
    assert.ok(page.includes('Up to ' + generations.toLocaleString('en-GB') + ' Fast-equivalent generations/month'));
  }
  assert.match(page, /StellarX computer control beta with approved setup/);
  assert.match(page, /Stronger models use more allowance/);
});

test('inline plan finder script has valid JavaScript syntax', () => {
  const source = page.match(/<script id="stellar-plan-fit-guide-js-v1">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source);
  assert.doesNotThrow(() => new Function(source));
});
