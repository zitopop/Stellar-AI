import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPlanDefinition } from '../lib/pricing.js';

const getPlan = await readFile(new URL('../api/get-plan.js', import.meta.url), 'utf8');

test('pricing exposes current server-owned model capabilities per plan', () => {
  assert.deepEqual(getPlanDefinition('free').models, ['spark', 'star']);
  assert.deepEqual(getPlanDefinition('starter').models, ['spark', 'star']);
  assert.deepEqual(getPlanDefinition('plus').models, ['spark', 'star', 'comet']);
  assert.deepEqual(getPlanDefinition('pro').models, ['spark', 'star', 'comet', 'nova']);
});

test('get-plan returns capabilities and billing readiness from the server', () => {
  assert.match(getPlan, /function planCapabilities\(plan\)/);
  assert.match(getPlan, /availableModels: capabilities\.models/);
  assert.match(getPlan, /const billing = billingState\(\{ plan, user, owner \}\)/);
  assert.match(getPlan, /includedCredits: definition\.includedCredits/);
  assert.match(getPlan, /modelCreditCosts/);
  assert.match(getPlan, /manageable: \/\^cus_\[A-Za-z0-9\]\+\$\/.test\(customerId\)/);
  assert.match(getPlan, /'stripe_syncing'/);
});
