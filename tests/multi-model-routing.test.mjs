import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelTier, getModelCandidates, resolveRoute } from '../api/chat.js';

test('current public model routing downgrades unavailable tiers safely', () => {
  assert.equal(resolveModelTier('spark', 'free'), 'spark');
  assert.equal(resolveModelTier('comet', 'free'), 'star');
  assert.equal(resolveModelTier('comet', 'plus'), 'comet');
  assert.equal(resolveModelTier('nova', 'pro'), 'nova');
  assert.equal(resolveModelTier('nova', 'starter'), 'star');
});

test('anthropic candidate fallbacks remain configured for each visible tier', () => {
  assert.deepEqual(getModelCandidates('spark'), ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']);
  assert.deepEqual(getModelCandidates('star'), ['claude-sonnet-5-5', 'claude-sonnet-5']);
  assert.deepEqual(getModelCandidates('comet'), ['claude-opus-5-5', 'claude-opus-4-8']);
  assert.deepEqual(getModelCandidates('nova'), ['claude-fable-5-1', 'claude-opus-5-5']);
});


test('current provider models map onto paid Stellar tiers', () => {
  assert.equal(resolveModelTier('gpt-6-luna', 'starter'), 'spark');
  assert.equal(resolveModelTier('gpt-6.1-sol', 'plus'), 'comet');
  assert.equal(resolveModelTier('gemini-3.8-flash', 'plus'), 'star');
  assert.equal(resolveModelTier('claude-sonnet-5-5', 'plus'), 'star');
  assert.equal(resolveModelTier('claude-opus-5-5', 'pro'), 'comet');
  assert.equal(resolveModelTier('claude-fable-5-1', 'pro'), 'nova');
  assert.equal(resolveModelTier('grok-4.7', 'pro'), 'comet');
});


test('general chat honours the customer-selected Stellar tier', () => {
  assert.equal(resolveRoute('spark', 'general', 'free').tier, 'spark');
  assert.equal(resolveRoute('star', 'general', 'free').tier, 'star');
  assert.equal(resolveRoute('comet', 'general', 'plus').tier, 'comet');
  assert.equal(resolveRoute('nova', 'general', 'pro').tier, 'nova');
});
