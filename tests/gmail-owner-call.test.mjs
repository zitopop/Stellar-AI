import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const push = readFileSync(new URL('../lib/gmail-push.js', import.meta.url), 'utf8');
const pushApi = readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');
const watchApi = pushApi;
const ownerCall = readFileSync(new URL('../lib/owner-call.js', import.meta.url), 'utf8');
const voice = readFileSync(new URL('../lib/jarvis-voice.js', import.meta.url), 'utf8');

test('Gmail push watches only inbox additions and calls the owner once per message', () => {
  assert.match(push, /GMAIL_PUBSUB_TOPIC/);
  assert.match(push, /labelIds: \['INBOX'\]/);
  assert.match(push, /labelFilterBehavior: 'INCLUDE'/);
  assert.match(push, /historyTypes: 'messageAdded'/);
  assert.match(push, /stellar:gmail:called:/);
  assert.match(push, /'NX'/);
  assert.match(push, /startOwnerCall/);
  assert.match(push, /trigger: 'gmail'/);
  assert.match(push, /GMAIL_CALL_ON_EMAIL/);
});

test('Gmail webhook accepts a server secret or verified Google Pub/Sub identity and keeps watch management owner/internal only', () => {
  assert.match(pushApi, /GMAIL_PUSH_TOKEN/);
  assert.match(pushApi, /timingSafeEqual/);
  assert.match(pushApi, /oauth2\.googleapis\.com\/tokeninfo/);
  assert.match(pushApi, /GMAIL_PUSH_AUDIENCE/);
  assert.match(pushApi, /GMAIL_PUSH_SERVICE_ACCOUNT/);
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
  assert.match(ownerCall, /metadata, \.\.\.metadata/);
  assert.match(voice, /stellar:jarvis:call:\$\{contextId\}/);
});

test('new email call path does not hardcode an owner phone number or OAuth secret', () => {
  assert.doesNotMatch(push, /07477|0477|160856/);
  assert.doesNotMatch(pushApi, /07477|0477|160856/);
  assert.doesNotMatch(push, /GMAIL_CLIENT_SECRET\s*=\s*['"][^'"]+/);
  assert.doesNotMatch(pushApi, /GMAIL_PUSH_TOKEN\s*=\s*['"][^'"]+/);
});
