import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');

test('voice input uses browser-native recognition without a paid voice provider',()=>{
  assert.match(app,/window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
  assert.match(app,/voiceRecognition\.interimResults=true/);
  assert.match(app,/voiceRecognition\.continuous=false/);
});

test('microphone permission failures are explicit and recoverable',()=>{
  assert.match(app,/not-allowed/);
  assert.match(app,/Microphone permission is blocked/);
  assert.match(app,/Voice input could not start/);
});

test('voice input never auto-sends a transcript',()=>{
  assert.match(app,/Review it, then press Send/);
  assert.doesNotMatch(app,/voiceRecognition\.onresult[\s\S]{0,900}requestSubmit\(\)/);
});

test('Jarvis narration remains user-controlled',()=>{
  assert.match(jarvis,/speechSynthesis/);
  assert.match(jarvis,/aria-pressed="false">JARVIS mode/);
  assert.match(jarvis,/Jarvis narration on/);
});
