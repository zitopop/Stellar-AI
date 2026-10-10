import test from 'node:test';
import assert from 'node:assert/strict';
import { classificationText, isContextualFollowUp } from '../lib/chat-intent.js';
import { FORGE_FAILOVER_STATUSES, getPremiumModelRestriction } from '../api/chat.js';

const user = (content) => ({ role: 'user', content });
const assistant = (content) => ({ role: 'assistant', content });

test('multiple short follow-ups keep the last concrete framework topic', () => {
  const messages = [
    user('My QBCore FiveM police job crashes on startup.'),
    assistant('Please share the console error.'),
    user('Can you fix it?'),
    assistant('The manifest may need correcting.'),
    user('Okay.'),
    assistant('We can make the change.'),
    user('What files do I need?'),
  ];
  const text = classificationText(messages);
  assert.match(text, /qbcore fivem police job/);
  assert.match(text, /what files do i need/);
});

test('explicit new topic does not inherit unrelated specialist context', () => {
  const messages = [
    user('My FiveM ESX inventory crashes.'),
    assistant('Inspect the resource logs.'),
    user('Can you write this birthday message for my friend?'),
  ];
  assert.equal(classificationText(messages), 'can you write this birthday message for my friend?');
  assert.equal(isContextualFollowUp('Can you write this birthday message for my friend?'), false);
});

test('explicit new technical topic overrides prior topic', () => {
  const messages = [user('Help with FiveM QBCore jobs'), user('Can you check this Roblox inventory?')];
  assert.equal(classificationText(messages), 'can you check this roblox inventory?');
});

test('no independent earlier user goal means no borrowed topic', () => {
  assert.equal(classificationText([assistant('Welcome'), user('Can you fix it?')]), 'can you fix it?');
  assert.equal(classificationText([user('Any ideas?'), user('What next?')]), 'what next?');
});

test('provider-overload 529 can trigger an allowed direct-provider fallback', () => {
  assert.equal(FORGE_FAILOVER_STATUSES.has(529), true);
  assert.equal(FORGE_FAILOVER_STATUSES.has(503), true);
  assert.equal(FORGE_FAILOVER_STATUSES.has(401), false);
});

test('model paywall gives customers the correct first eligible plan', () => {
  assert.deepEqual(getPremiumModelRestriction('star'), {
    error: 'Stellar Core is included with Starter, Plus and Pro.',
    recommendedPlan: 'starter',
  });
  assert.deepEqual(getPremiumModelRestriction('comet'), {
    error: 'Stellar Deep is included with Plus and Pro.',
    recommendedPlan: 'plus',
  });
  assert.deepEqual(getPremiumModelRestriction('nova'), {
    error: 'Stellar Max is included with Pro.',
    recommendedPlan: 'pro',
  });
});
