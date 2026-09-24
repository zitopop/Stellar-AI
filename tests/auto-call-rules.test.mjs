import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DEFAULT_OWNER_CALL_POLICY,
  classifyOwnerAutoCall,
  normalizeOwnerCallPolicy,
} from '../lib/auto-call-rules.js';

const broadcast = readFileSync(new URL('../api/broadcast.js', import.meta.url), 'utf8');

test('owner auto-call rules only fire for high-signal urgent categories', () => {
  assert.equal(classifyOwnerAutoCall({ subject: 'hello from newsletter' }).shouldCall, false);
  assert.deepEqual(classifyOwnerAutoCall({ subject: 'Payment failed for invoice' }).category, 'payment');
  assert.deepEqual(classifyOwnerAutoCall({ subject: 'Can we book a demo?' }).category, 'lead');
  assert.deepEqual(classifyOwnerAutoCall({ subject: 'Refund please' }).category, 'refund');
});

test('auto-call policy defaults are safe and include new business triggers', () => {
  const policy = normalizeOwnerCallPolicy({ cooldownMinutes: 1, categories: ['payment', 'lead', 'bad'] });
  assert.equal(policy.cooldownMinutes, 15);
  assert.ok(policy.categories.includes('payment'));
  assert.ok(policy.categories.includes('lead'));
  assert.ok(DEFAULT_OWNER_CALL_POLICY.categories.includes('refund'));
  assert.ok(DEFAULT_OWNER_CALL_POLICY.categories.includes('lead'));
});

test('owner escalation uses central policy and records cooldown before pending Twilio calls', () => {
  assert.match(broadcast, /OWNER_AUTO_CALL_CATEGORIES/);
  assert.match(broadcast, /normalizeOwnerCallPolicy/);
  const dataLine = broadcast.indexOf('const data = await startOwnerCall');
  const lastLine = broadcast.indexOf('stellar:owner-call:last', dataLine);
  const twilioLine = broadcast.indexOf("data?.provider === 'twilio'", dataLine);
  assert.ok(dataLine > 0);
  assert.ok(lastLine > dataLine);
  assert.ok(twilioLine > lastLine);
  assert.match(broadcast, /\.\.\.metadata/);
});
