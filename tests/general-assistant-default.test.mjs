import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSystemPrompt, resolveRoute } from '../api/chat.js';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('ordinary chat defaults to the general assistant role', () => {
  const route = resolveRoute('star', '', 'free');
  assert.equal(route.role, 'general');
  assert.equal(route.tier, 'star');
  assert.match(route.instruction, /GENERAL ASSISTANT mode/);
});

test('specialist implementation mode remains available when explicitly requested', () => {
  const route = resolveRoute('star', 'implementer', 'free');
  assert.equal(route.role, 'implementer');
  assert.match(route.instruction, /IMPLEMENTER mode/);
});

test('general prompt supports everyday conversation without forcing coding structure', () => {
  const prompt = buildSystemPrompt('', 'general', 'general', 'unknown', 'general', '', 'free');
  assert.match(prompt, /general-purpose AI assistant/);
  assert.match(prompt, /I love Stellar AI/);
  assert.match(prompt, /Do not force those labels into casual conversation/);
});

test('signed-out app clearly tells visitors they can try chat without signing in', () => {
  assert.match(app, /No sign-in required to try Stellar/);
  assert.match(app, /Ask me anything/);
});
