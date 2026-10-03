import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('current workspace does not silently request microphone permissions', () => {
  assert.doesNotMatch(app, /getUserMedia\s*\(/);
  assert.doesNotMatch(app, /voiceRecognitionBlocked=true/);
});
