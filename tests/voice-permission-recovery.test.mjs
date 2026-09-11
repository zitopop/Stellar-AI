import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('voice call explicitly requests microphone access before listening', () => {
  assert.match(app, /async function ensureVoiceMicrophonePermission\(\)/);
  assert.match(app, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(app, /echoCancellation:true/);
  assert.match(app, /const allowed=await ensureVoiceMicrophonePermission\(\)/);
});

test('voice call stops automatic recognition retries after blocked microphone errors', () => {
  assert.match(app, /voiceRecognitionBlocked=true/);
  assert.match(app, /\['not-allowed','service-not-allowed','audio-capture'\]/);
  assert.match(app, /voiceCallActive && !voiceRecognitionBlocked/);
});