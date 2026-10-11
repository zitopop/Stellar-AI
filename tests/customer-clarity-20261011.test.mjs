import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAN_DEFINITIONS, PAID_MODEL_CREDIT_COSTS, creditCostForModel } from '../lib/pricing.js';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const app = read('app.html');
const home = read('index.html');
const plans = read('plans.html');
const support = read('support.html');
const scriptFix = read('services/script-fix.html');

test('the app does not claim a usage balance before authentication', () => {
  assert.match(app, /id="usageCount">Sign in to view<\/strong>/);
  assert.match(app, /aria-label="Open usage details"/);
  assert.doesNotMatch(app, /id="usageCount">100% left/);
});

test('app fallback rates agree with server-owned paid credit costs', () => {
  assert.deepEqual(PAID_MODEL_CREDIT_COSTS, { spark: 2, star: 4, comet: 8, nova: 16 });
  assert.match(app, /const PAID_COSTS=\{spark:2,star:4,comet:8,nova:16\}/);
  assert.match(app, /planState\?\.costs\?\.\[selectedModel\] \?\? fallbackCosts\[selectedModel\]/);
  assert.match(app, /planState\.costs\?\.\[key\] \?\? fallbackCosts\[key\]/);
});

test('customer prices, tier names and advertised Fast-equivalent allowances stay aligned', () => {
  assert.equal(PLAN_DEFINITIONS.free.includedCredits / creditCostForModel('spark', 'free'), 15);
  for (const [tier, fastEquivalent, monthlyPrice] of [
    ['starter', '2,500', '£8'],
    ['plus', '7,500', '£20'],
    ['pro', '15,000', '£75'],
  ]) {
    assert.equal(PLAN_DEFINITIONS[tier].includedCredits / creditCostForModel('spark', tier),
      Number(fastEquivalent.replaceAll(',', '')));
    assert.ok(home.includes(monthlyPrice + '<small>/mo</small>'));
    assert.ok(home.includes(fastEquivalent + ' Fast-equivalent generations/month'));
    assert.ok(plans.includes(fastEquivalent + ' Fast generations/month'));
  }
  for (const name of ['Stellar Fast','Stellar Core','Stellar Deep','Stellar Max']) {
    assert.ok(home.includes(name));
    assert.ok(plans.includes(name));
  }
});

test('support and paid handoff use Stellar branding and current product terminology', () => {
  assert.match(support, /Models &amp; Jarvis/);
  assert.match(support, /Fast, Core, Deep or Max unavailable/);
  assert.match(support, /Stellar AI support/);
  assert.doesNotMatch(support, /Discord promotions|Giveaway or promotion questions|DeadlyFox support/);
  assert.match(scriptFix, /sent privately to the Stellar AI operator/);
});
