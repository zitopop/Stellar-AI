import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizePhoneNumber, ownerPhoneMatches } from '../lib/jarvis-voice.js';

test('UK owner number matches local, international and 00 formats', () => {
  assert.equal(normalizePhoneNumber('07123 456789'), '+447123456789');
  assert.equal(normalizePhoneNumber('+44 7123 456789'), '+447123456789');
  assert.equal(normalizePhoneNumber('0044 7123 456789'), '+447123456789');
  assert.equal(ownerPhoneMatches('07123 456789', '+447123456789'), true);
  assert.equal(ownerPhoneMatches('+447123456789', '+447999999999'), false);
});

test('owner calls carry verified identity without storing a phone number in code', () => {
  const voice = fs.readFileSync(new URL('../lib/jarvis-voice.js', import.meta.url), 'utf8');
  const call = fs.readFileSync(new URL('../lib/owner-call.js', import.meta.url), 'utf8');
  assert.match(voice, /signed-provider-number-match/);
  assert.match(voice, /Do not ask them to state or verify their name again/);
  assert.match(call, /outbound-owner-call/);
  assert.doesNotMatch(voice + call, /07123 456789/);
});