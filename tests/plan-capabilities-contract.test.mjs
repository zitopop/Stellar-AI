import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPlanDefinition } from '../lib/pricing.js';

const getPlan = await readFile(new URL('../api/get-plan.js', import.meta.url), 'utf8');

test('pricing exposes server-owned model capabilities per plan', () => {
  assert.deepEqual(getPlanDefinition('free').models, ['spark', 'star']);
  assert.deepEqual(getPlanDefinition('starter').models, ['spark', 'star']);
  assert.deepEqual(getPlanDefinition('plus').models, ['spark', 'star', 'comet']);
  assert.deepEqual(getPlanDefinition('pro').models, ['spark', 'star', 'comet', 'nova']);
});

test('get-plan returns plan capabilities and billing readiness instead of making the app guess', () => {
  assert.match(getPlan, /function planCapabilities\(plan\)/);
  assert.match(getPlan, /availableModels: capabilities\.models/);
  assert.match(getPlan, /billing: billingState\(\{ plan, user, owner \}\)/);
  assert.match(getPlan, /requestsPerHour: definition\.requestsPerHour/);
  assert.match(getPlan, /maxTokens: definition\.maxTokens/);
  assert.match(getPlan, /manageable: \/^cus_/);
  assert.match(getPlan, /reason: 'stripe_syncing'/);
});
