import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelTier, getModelCandidates } from '../api/chat.js';

test('current public model routing downgrades unavailable tiers safely', () => {
  assert.equal(resolveModelTier('spark', 'free'), 'spark');
  assert.equal(resolveModelTier('comet', 'free'), 'star');
  assert.equal(resolveModelTier('comet', 'plus'), 'comet');
  assert.equal(resolveModelTier('nova', 'pro'), 'nova');
  assert.equal(resolveModelTier('nova', 'starter'), 'star');
});

test('anthropic candidate fallbacks remain configured for each visible tier', () => {
  assert.deepEqual(getModelCandidates('spark'), ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']);
  assert.deepEqual(getModelCandidates('star'), ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']);
  assert.deepEqual(getModelCandidates('comet'), ['claude-opus-4-6', 'claude-sonnet-4-6']);
  assert.deepEqual(getModelCandidates('nova'), ['claude-opus-4-8', 'claude-sonnet-4-6']);
});
