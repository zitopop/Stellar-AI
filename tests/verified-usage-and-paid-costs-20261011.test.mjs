import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_CREDIT_COSTS, PAID_MODEL_CREDIT_COSTS } from '../lib/pricing.js';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('paid credit previews fall back to server-defined paid rates, not trial rates', () => {
  assert.deepEqual(MODEL_CREDIT_COSTS, { spark: 2, star: 5, comet: 10, nova: 20 });
  assert.deepEqual(PAID_MODEL_CREDIT_COSTS, { spark: 2, star: 4, comet: 8, nova: 16 });
  assert.match(app, /const PAID_COSTS=\{spark:2,star:4,comet:8,nova:16\}/);
  assert.match(app, /fallbackModelCosts\(planState\?\.plan\)\[selectedModel\]/);
  assert.match(app, /fallbackModelCosts\(planState\?\.plan\)\[key\]/);
  assert.match(app, /fallbackModelCosts\(data\.plan\|\|data\.planId\|\|account\.id\)/);
});
test('a signed-in session does not display unverified account credits', () => {
  assert.match(app, /planTruthStatus='pending'/);
  assert.match(app, /planTruthStatus='ready';updateHeader\(\)/);
  assert.match(app, /planTruthStatus='unavailable'/);
  assert.match(app, /planTruthStatus==='ready'\?fmt\(/);
  assert.match(app, /Usage balance unavailable/);
  assert.match(app, /Balance unavailable/);
  assert.match(app, /checking balance/);
  assert.match(app, /sign in to see balance/);
});
