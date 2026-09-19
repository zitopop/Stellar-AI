import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const outbound = readFileSync(new URL('../lib/outbound-call.js', import.meta.url), 'utf8');
const voice = readFileSync(new URL('../lib/jarvis-voice.js', import.meta.url), 'utf8');
const broadcast = readFileSync(new URL('../api/broadcast.js', import.meta.url), 'utf8');

test('Jarvis outbound calls are owner-confirmed, rate-limited and use E.164', () => {
  assert.match(outbound, /const E164 =/);
  assert.match(outbound, /10 \* 60 \* 1000/);
  assert.match(outbound, /count >= 20/);
  assert.match(broadcast, /confirmedByOwner !== true/);
  assert.match(broadcast, /callContactInternal/);
  assert.match(broadcast, /x-call-bridge-token/);
});

test('Jarvis identifies itself as AI when calling another person', () => {
  assert.match(outbound, /mode: 'outbound-public'/);
  assert.match(voice, /state\.mode === 'outbound-public'/);
  assert.match(voice, /I'm Jarvis, an AI assistant calling on behalf of Tobi at Stellar AI/);
  assert.match(voice, /state\.mode === 'outbound-owner' \|\| state\.mode === 'inbound-owner'/);
});

test('outbound provider does not expose or hard-code private target numbers', () => {
  assert.match(outbound, /TWILIO_ACCOUNT_SID/);
  assert.match(outbound, /TWILIO_AUTH_TOKEN/);
  assert.match(outbound, /TWILIO_FROM_NUMBER/);
  assert.match(outbound, /api\.twilio\.com/);
  assert.doesNotMatch(outbound, /07477|0477|160856/);
});
