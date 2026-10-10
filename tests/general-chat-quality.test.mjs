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


test('a new everyday topic does not inherit an earlier FiveM discussion', () => {
  const messages = [
    { role: 'user', content: 'Build a QBCore police job for my FiveM server.' },
    { role: 'assistant', content: 'We can start with the server resource.' },
    { role: 'user', content: 'Why does the sky look blue?' },
  ];
  const platform = detectPlatform(messages);
  const workflow = detectWorkflowMode(messages, platform);
  assert.equal(platform, 'general');
  assert.equal(workflow, 'general');
  assert.equal(detectRequestKind(messages, platform, workflow), 'general');
});

test('a short follow-up keeps its last user topic', () => {
  const messages = [
    { role: 'user', content: 'My FiveM QBCore script will not start.' },
    { role: 'assistant', content: 'Check your fxmanifest and server console.' },
    { role: 'user', content: 'Can you fix it?' },
  ];
  const platform = detectPlatform(messages);
  const workflow = detectWorkflowMode(messages, platform);
  assert.equal(platform, 'fivem');
  assert.equal(detectRequestKind(messages, platform, workflow), 'technical');
});

test('an explicit Roblox question does not remain stuck in FiveM or ESX mode', () => {
  const messages = [
    { role: 'user', content: 'Help me debug an ESX FiveM job.' },
    { role: 'assistant', content: 'Here is an approach.' },
    { role: 'user', content: 'Now help me with a Roblox Luau inventory.' },
  ];
  assert.equal(detectPlatform(messages), 'roblox');
});

test('an unrelated birthday message ignores old business and API context', () => {
  const messages = [
    { role: 'user', content: 'How can I get Shopify clients and fix my API?' },
    { role: 'assistant', content: 'We can improve the website.' },
    { role: 'user', content: 'Write a happy birthday note for my friend.' },
  ];
  const platform = detectPlatform(messages);
  const workflow = detectWorkflowMode(messages, platform);
  assert.equal(platform, 'general');
  assert.equal(workflow, 'general');
  assert.equal(detectRequestKind(messages, platform, workflow), 'general');
});
