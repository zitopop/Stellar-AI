import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('composer opens a dedicated accessible full-screen voice call', () => {
  assert.match(app, /id="mic-btn" onclick="openVoiceCall\(\)"[^>]*aria-label="Start voice call"/);
  assert.match(app, /id="voice-call-modal"[^>]*role="dialog" aria-modal="true" aria-labelledby="voice-call-title"/);
  assert.match(app, /\.voice-call-shell\{width:100vw;max-width:none;min-height:100dvh/);
  assert.match(app, /function openVoiceCall\(\)/);
  assert.match(app, /function closeVoiceCall\(\)/);
});

test('voice call mirrors a simple realtime-call interaction pattern', () => {
  assert.match(app, /id="voice-call-orb"[^>]*onclick="interruptVoiceCall\(\)"/);
  assert.match(app, /function interruptVoiceCall\(\)/);
  assert.match(app, /Stellar is speaking\. Tap to interrupt and listen/);
  assert.match(app, /id="voice-call-status"[^>]*aria-live="polite"/);
  assert.match(app, /id="voice-call-caption"[^>]*aria-live="polite"/);
});

test('voice call keeps all essential controls visible on phones', () => {
  assert.match(app, /id="voice-call-mic"[^>]*onclick="toggleVoiceCallMic\(\)"/);
  assert.match(app, /onclick="openVoiceSettingsFromCall\(\)"/);
  assert.match(app, /class="voice-call-control voice-call-end" onclick="closeVoiceCall\(\)"/);
  assert.match(app, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});