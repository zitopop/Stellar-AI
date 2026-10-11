import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSmartTier } from '../lib/smart-routing.js';

const smart = (prompt, plan, extras = {}) => selectSmartTier({
  messages: [{ role: 'user', content: prompt }], plan, ...extras
});

test('Smart never selects an inaccessible paid tier', () => {
  const hard = 'Audit security architecture, debug authentication, review edge cases and implement a complete production migration with dependencies.';
  assert.equal(smart(hard, 'free'), 'spark');
  assert.equal(smart(hard, 'starter'), 'star');
  assert.ok(['star', 'comet'].includes(smart(hard, 'plus')));
  assert.ok(['comet', 'nova'].includes(smart(hard, 'pro')));
});
test('Smart uses inexpensive Fast for simple everyday requests', () => {
  for (const plan of ['free', 'starter', 'plus', 'pro', 'owner']) {
    assert.equal(smart('Hi there!', plan), 'spark');
  }
});
test('Smart routes complex tasks progressively when available', () => {
  const prompt = 'Debug this API route, analyse the traceback and implement a complete authentication migration with tests and edge cases.';
  assert.equal(smart(prompt, 'plus'), 'comet');
  assert.equal(smart(prompt, 'pro'), 'nova');
});
test('Smart ignores assistant messages and does not trust client-supplied provider IDs', () => {
  assert.equal(selectSmartTier({ messages: [{role:'assistant',content:'debug refactor migration'}], plan:'pro'}), 'spark');
  assert.equal(smart('Hello', 'invented-plan'), 'spark');
});
