import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readOwnerCallHealth, startOwnerCall } from '../lib/owner-call.js';

const provider=readFileSync(new URL('../lib/owner-call.js',import.meta.url),'utf8');
const voice=readFileSync(new URL('../lib/jarvis-voice.js',import.meta.url),'utf8');
const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');

test('Jarvis can use a direct Twilio owner-call provider without exposing the owner number to clients',()=>{
  assert.match(provider,/TWILIO_ACCOUNT_SID/);
  assert.match(provider,/TWILIO_AUTH_TOKEN/);
  assert.match(provider,/TWILIO_FROM_NUMBER/);
  assert.match(provider,/OWNER_PHONE/);
  assert.match(provider,/api\.twilio\.com\/2010-04-01\/Accounts/);
  assert.match(provider,/voice\.twilio\.com\/v1\/DialingPermissions\/Countries\/GB/);
  assert.match(provider,/low_risk_numbers_enabled/);
  assert.match(provider,/DESTINATION_NOT_ALLOWED/);
  assert.match(provider,/stellar:jarvis:call:\$\{id\}/);
  assert.doesNotMatch(provider,/stellar:jarvis:call-context/);
  assert.match(provider,/checkCallContextStorage/);
  assert.match(provider,/stellar:jarvis:health-probe/);
  assert.match(provider,/callContextStorageConfigured/);
  assert.doesNotMatch(provider,/07477|0477|160856/);
});

test('direct Twilio failure keeps the existing Retell bridge as a fallback',()=>{
  assert.match(provider,/startTwilioOwnerCall/);
  assert.match(provider,/startBridgeOwnerCall/);
  assert.match(provider,/provider: 'twilio'/);
  assert.match(provider,/provider: 'retell'/);
});

test('Jarvis voice webhook validates Twilio and supports guarded two-way speech',()=>{
  assert.match(voice,/x-twilio-signature/);
  assert.match(voice,/createHmac\('sha1'/);
  assert.match(voice,/<Gather input="speech"/);
  assert.match(voice,/MAX_PUBLIC_TURNS = 12/);
  assert.match(voice,/MAX_OWNER_SILENCE_RETRIES = 5/);
  assert.match(voice,/!ownerMode && turn >= MAX_PUBLIC_TURNS/);
  assert.match(voice,/if \(ownerMode\) return sendXml\(res, gather\(reply/);
  assert.match(voice,/experimental_conversations/);
  assert.match(voice,/JARVIS_SPEECH_TIMEOUT \|\| '2'/);
  assert.match(voice,/hints=/);
  assert.match(voice,/profanityFilter="false"/);
  assert.match(voice,/Confidence/);
  assert.match(voice,/JARVIS_TWILIO_SPEECH_RATE/);
  assert.match(voice,/<prosody rate=/);
  assert.match(voice,/call-fallback-email/);
  assert.match(voice,/const from = resendSender\(\)/);
  assert.match(voice,/conversational and under 38 words/);
  assert.match(voice,/never more than once in a reply/);
  assert.match(voice,/ANTHROPIC_API_KEY/);
  assert.match(voice,/inbound-owner/);
  assert.match(voice,/inbound-public/);
  assert.match(voice,/outbound-owner/);
  assert.match(broadcast,/jarvisVoice/);
  assert.match(broadcast,/handleJarvisVoiceWebhook/);
  assert.match(provider,/api\/broadcast\?jarvisVoice=1/);
});


test('configured Twilio health check uses the validated provider config without throwing', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','KV_REST_API_URL','KV_REST_API_TOKEN'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  globalThis.fetch = async (url) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ low_risk_numbers_enabled: true });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const health = await readOwnerCallHealth({});
    assert.equal(health.provider, 'twilio');
    assert.equal(health.ready, true);
    assert.equal(health.ownerNumberConfigured, true);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('partial Twilio config does not block the Retell bridge fallback', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'not-a-valid-account-sid';
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
  delete process.env.OWNER_PHONE;
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/call-owner')) return Response.json({ ready: true, retell: true, ownerNumber: true, outboundNumber: true, agent: true, configuredAgent: true, configuredNumber: true, call_id: 'call_fixture', status: 'started' });
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const call = await startOwnerCall({ purpose: 'Regression test', bridgeToken: 'fixture' });
    assert.equal(call.provider, 'retell');
    assert.equal(call.call_id, 'call_fixture');
    const health = await readOwnerCallHealth({ bridgeToken: 'fixture' });
    assert.equal(health.ready, true);
    assert.equal(health.provider, 'retell');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
