import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');

test('workspace exposes accessible browser voice input', () => {
  assert.match(app, /id="voice-input-btn"[^>]*aria-label="Start voice input"[^>]*aria-pressed="false"/);
  assert.match(app, /function initVoiceInput\(\)/);
  assert.match(app, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
  assert.match(app, /recognition\.lang=document\.documentElement\.lang\|\|'en-GB'/);
});

test('voice transcript is reviewed before explicit send', () => {
  assert.match(app, /Review it, then press Send/);
  assert.doesNotMatch(app, /recognition\.onend[\s\S]{0,500}(?:requestSubmit|sendMessage)\(/);
});

test('Jarvis Voice orb routes into current app voice mode', () => {
  assert.match(jarvis, /if\(name==='Voice'\)\{location\.href='\/app\?jarvis=voice'/);
  assert.match(app, /function applyJarvisEntry\(\)/);
  assert.match(app, /Voice mode ready\. Press Voice and speak your message\./);
});
