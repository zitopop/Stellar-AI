import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chat = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

test('public model input contract exposes only Stellar capability tiers', () => {
  assert.match(chat, /const PUBLIC_MODEL_INPUTS = new Set\(\[\s*'spark', 'star', 'comet', 'nova',\s*\]\);/);
  assert.doesNotMatch(chat, /PUBLIC_MODEL_INPUTS[\s\S]{0,300}'gpt-/);
  assert.doesNotMatch(chat, /PUBLIC_MODEL_INPUTS[\s\S]{0,300}'gemini-/);
  assert.doesNotMatch(chat, /PUBLIC_MODEL_INPUTS[\s\S]{0,300}'claude-/);
  assert.doesNotMatch(chat, /PUBLIC_MODEL_INPUTS[\s\S]{0,300}'grok-/);
});
