import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const provider=readFileSync(new URL('../lib/owner-call.js',import.meta.url),'utf8');
const voice=readFileSync(new URL('../lib/jarvis-voice.js',import.meta.url),'utf8');
const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');

test('Jarvis can use a direct Twilio owner-call provider without exposing the owner number to clients',()=>{
  assert.match(provider,/TWILIO_ACCOUNT_SID/);
  assert.match(provider,/TWILIO_AUTH_TOKEN/);
  assert.match(provider,/TWILIO_FROM_NUMBER/);
  assert.match(provider,/OWNER_PHONE/);
  assert.match(provider,/api\.twilio\.com\/2010-04-01\/Accounts/);
  assert.match(provider,/stellar:jarvis:call-context/);
  assert.doesNotMatch(provider,/07477|0477|160856/);
});

test('direct Twilio failure keeps the existing Retell bridge as a fallback',()=>{
  assert.match(provider,/startTwilioOwnerCall/);
  assert.match(provider,/startBridgeOwnerCall/);
  assert.match(provider,/provider: 'twilio'/);
  assert.match(provider,/provider: 'retell'/);
});

test('Jarvis voice webhook validates Twilio and supports bounded two-way speech',()=>{
  assert.match(voice,/x-twilio-signature/);
  assert.match(voice,/createHmac\('sha1'/);
  assert.match(voice,/<Gather input="speech"/);
  assert.match(voice,/MAX_TURNS = 12/);
  assert.match(voice,/experimental_conversations/);
  assert.match(voice,/JARVIS_SPEECH_TIMEOUT \|\| '2'/);
  assert.match(voice,/hints=/);
  assert.match(voice,/profanityFilter="false"/);
  assert.match(voice,/Confidence/);
  assert.match(voice,/ANTHROPIC_API_KEY/);
  assert.match(voice,/inbound-owner/);
  assert.match(voice,/inbound-public/);
  assert.match(voice,/outbound-owner/);
  assert.match(broadcast,/jarvisVoice/);
  assert.match(broadcast,/handleJarvisVoiceWebhook/);
  assert.match(provider,/api\/broadcast\?jarvisVoice=1/);
});