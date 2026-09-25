import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { classifyOwnerAutoCall } from '../lib/auto-call-rules.js';

const push = readFileSync(new URL('../lib/gmail-push.js', import.meta.url), 'utf8');
const pushApi = readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');
const watchApi = pushApi;
const ownerCall = readFileSync(new URL('../lib/owner-call.js', import.meta.url), 'utf8');
const voice = readFileSync(new URL('../lib/jarvis-voice.js', import.meta.url), 'utf8');

test('Gmail push watches inbox additions but only auto-calls for urgent rules', () => {
  assert.match(push, /GMAIL_PUBSUB_TOPIC/);
  assert.match(push, /labelIds: \['INBOX'\]/);
  assert.match(push, /labelFilterBehavior: 'INCLUDE'/);
  assert.match(push, /historyTypes: 'messageAdded'/);
  assert.match(push, /stellar:gmail:called:/);
  assert.match(push, /'NX'/);
  assert.match(push, /classifyOwnerAutoCall/);
  assert.match(push, /escalateOwner/);
  assert.match(push, /not-urgent/);
  assert.match(push, /trigger: 'gmail'/);
  assert.match(push, /GMAIL_CALL_ON_EMAIL/);
});

test('CI failure emails are treated as service-critical owner alerts', () => {
  const result = classifyOwnerAutoCall({
    from: 'zitopop notifications@github.com',
    subject: '[zitopop/Stellar-AI] Run failed: Stellar AI CI - main',
    snippet: 'Stellar AI CI workflow run: all jobs have failed',
  });
  assert.equal(result.shouldCall, true);
  assert.equal(result.category, 'service');
  assert.equal(result.severity, 'critical');
});

test('Gmail webhook requires a server secret and mailbox watch management stays owner/internal only', () => {
  assert.match(pushApi, /GMAIL_PUSH_TOKEN/);
  assert.match(pushApi, /timingSafeEqual/);
  assert.match(pushApi, /processGmailPush/);
  assert.match(watchApi, /requireSession/);
  assert.match(watchApi, /isOwnerEmail/);
  assert.match(watchApi, /CRON_SECRET/);
  assert.match(watchApi, /CALL_BRIDGE_TOKEN/);
  assert.match(watchApi, /startGmailWatch/);
});

test('outbound owner-call context is stored under the same key Jarvis voice reads', () => {
  assert.match(ownerCall, /stellar:jarvis:call:\$\{id\}/);
  assert.doesNotMatch(ownerCall, /stellar:jarvis:call-context:/);
  assert.match(ownerCall, /mode: 'outbound-owner'/);
  assert.match(ownerCall, /enrichedMetadata/);
  assert.match(ownerCall, /ownerIdentity/);
  assert.match(voice, /stellar:jarvis:call:\$\{contextId\}/);
});

test('new email call path does not hardcode an owner phone number or OAuth secret', () => {
  assert.doesNotMatch(push, /07477|0477|160856/);
  assert.doesNotMatch(pushApi, /07477|0477|160856/);
  assert.doesNotMatch(push, /GMAIL_CLIENT_SECRET\s*=\s*['"][^'"]+/);
  assert.doesNotMatch(pushApi, /GMAIL_PUSH_TOKEN\s*=\s*['"][^'"]+/);
});
