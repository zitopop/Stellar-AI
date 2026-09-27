import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const publicJarvis = readFileSync(new URL('../jarvis-workspace.html', import.meta.url), 'utf8');
const ownerJarvis = readFileSync(new URL('../jarvis-owner.html', import.meta.url), 'utf8');
const ownerHandler = readFileSync(new URL('../lib/jarvis-mission-handler.js', import.meta.url), 'utf8');

test('public Jarvis uses normal Stellar chat with type and voice controls', () => {
  assert.match(publicJarvis, /fetch\('\/api\/chat'/);
  assert.match(publicJarvis, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
  assert.match(publicJarvis, /SpeechSynthesisUtterance/);
  assert.match(publicJarvis, /client:\{source:'jarvis-public'\}/);
});

test('public Jarvis does not call private mission surface', () => {
  assert.doesNotMatch(publicJarvis, /surface=jarvis/);
  assert.match(ownerJarvis, /jarvis-workspace\.js/);
  assert.match(ownerHandler, /isOwnerEmail\(session\.email\)/);
});
