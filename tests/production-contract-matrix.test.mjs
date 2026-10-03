import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelTier } from '../api/chat.js';
import { getPlanDefinition } from '../lib/pricing.js';

const plans = ['free', 'starter', 'plus', 'pro', 'owner'];
const aliases = {
  spark: ['spark', 'fabie', 'claude-haiku-4-5-20251001'],
  star: ['star', 'smart', 'claude-sonnet-5-5', 'claude-sonnet-4-6', 'gemini-3.8-flash'],
  comet: ['comet', 'claude-opus-5-5', 'claude-opus-4-6', 'gpt-6-sol', 'gpt-6.1-sol', 'grok-4.7'],
  nova: ['nova', 'ultra', 'claude-fable-5-1', 'gpt-6-astra'],
};

function expected(tier, plan) {
  const allowed = getPlanDefinition(plan).models;
  return allowed.includes(tier) ? tier : allowed.includes('star') ? 'star' : allowed[0];
}

test('model resolver respects current server plan capabilities', () => {
  for (const plan of plans) {
    for (const [tier, values] of Object.entries(aliases)) {
      for (const value of values) assert.equal(resolveModelTier(value, plan), expected(tier, plan));
    }
  }
  assert.equal(resolveModelTier('CLAUDE-OPUS-4-6', 'plus'), 'comet');
  assert.equal(resolveModelTier('claude-fable-5-1', 'plus'), 'star');
  assert.deepEqual(getPlanDefinition('starter').models, ['spark', 'star']);
  assert.deepEqual(getPlanDefinition('plus').models, ['spark', 'star', 'comet']);
  assert.deepEqual(getPlanDefinition('pro').models, ['spark', 'star', 'comet', 'nova']);
  assert.deepEqual(getPlanDefinition('owner').models, ['spark', 'star', 'comet', 'nova']);
});
