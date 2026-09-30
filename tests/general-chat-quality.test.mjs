import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, detectRequestKind, detectPlatform, detectWorkflowMode } from '../api/chat.js';

const msg = (content) => [{ role: 'user', content }];

test('ordinary chat stays in general conversation mode', () => {
  const messages = msg('Can you explain why the sky looks blue?');
  const platform = detectPlatform(messages);
  const workflow = detectWorkflowMode(messages, platform);
  const kind = detectRequestKind(messages, platform, workflow);
  const prompt = buildSystemPrompt('', platform, workflow, 'unknown', 'general', '', 'free', kind);
  assert.equal(kind, 'general');
  assert.match(prompt, /GENERAL CHAT QUALITY/);
  assert.doesNotMatch(prompt, /CODE INTELLIGENCE/);
  assert.doesNotMatch(prompt, /WORKFLOW MODE: GENERAL IMPLEMENTATION/);
  assert.doesNotMatch(prompt, /FIVEM QUALITY|ROBLOX QUALITY|ROBLOX BUILD PACK MODE|DELIVERY STANDARD/);
});

test('coding requests keep engineering guidance', () => {
  const messages = msg('Debug this JavaScript API error in my web app');
  const platform = detectPlatform(messages);
  const workflow = detectWorkflowMode(messages, platform);
  const kind = detectRequestKind(messages, platform, workflow);
  const prompt = buildSystemPrompt('', platform, workflow, 'unknown', 'general', '', 'plus', kind);
  assert.equal(kind, 'technical');
  assert.match(prompt, /CODE INTELLIGENCE/);
  assert.match(prompt, /PLAN QUALITY: PLUS/);
  assert.match(prompt, /WORKFLOW MODE: CODE AUDIT/);
});
