import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const helper=readFileSync(new URL('../lib/owner-escalation.js',import.meta.url),'utf8');
const webhook=readFileSync(new URL('../api/webhook.js',import.meta.url),'utf8');
const chat=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');

test('server escalation uses the protected Stellar endpoint',()=>{
  assert.match(helper,/CALL_BRIDGE_TOKEN/);
  assert.match(helper,/action: 'escalateOwner'/);
  assert.match(helper,/x-call-bridge-token/);
  assert.match(helper,/threshold = 3/);
  assert.match(helper,/windowSeconds = 300/);
});

test('verified Stripe processing failures can escalate payment incidents',()=>{
  assert.match(webhook,/import \{ escalateOwner \}/);
  assert.match(webhook,/if \(event\?\.id\)/);
  assert.match(webhook,/category: 'payment'/);
  assert.match(webhook,/severity: 'critical'/);
});

test('repeated AI service failures feed the owner escalation system',()=>{
  assert.match(chat,/recordRepeatedServiceFailure/);
  assert.match(chat,/usage-enforcement/);
  assert.match(chat,/ai-upstream-/);
});