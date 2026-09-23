import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelTier } from '../api/chat.js';
import { getPlanDefinition } from '../lib/pricing.js';

const plans = ['free', 'starter', 'plus', 'pro', 'owner'];
const aliases = {
  spark: ['spark', 'fabie', 'claude-haiku-4-5-20251001'],
  star: ['star', 'smart', 'claude-sonnet-4-6'],
  comet: ['comet', 'claude-opus-4-6'],
  nova: ['nova', 'ultra', 'claude-opus-4-8'],
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
  assert.equal(resolveModelTier('claude-opus-4-8', 'plus'), 'star');
});
