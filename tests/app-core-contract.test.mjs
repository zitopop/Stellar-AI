import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app page is not empty and exposes the core chat workspace', () => {
  assert.ok(app.length > 15000, 'app.html should contain the real app shell, not an empty file');
  assert.match(app, /<title>Stellar AI Chat<\/title>/);
  assert.match(app, /id="chatForm"/);
  assert.match(app, /id="prompt"/);
  assert.match(app, /id="sendBtn"/);
  assert.match(app, /fetch\('\/api\/chat'/);
  assert.match(app, /Thinking…/);
  assert.match(app, /Send failed/);
});

test('app exposes deliberate chat, plan, credit and account controls', () => {
  for (const text of ['New chat', 'Plans', 'Credits', 'Help']) assert.ok(app.includes(text), text);
  assert.match(app, /data-open="models"/);
  assert.match(app, /data-open="settings"/);
  assert.match(app, /id="topupAmount"/);
  assert.match(app, /function startCreditCheckout\(/);
  assert.match(app, /No chats yet\./);
  assert.match(app, /function renderPlansPanel\(\)/);
  assert.match(app, /function renderCreditsPanel\(\)/);
});

test('app includes mobile-safe layout rules and tap targets', () => {
  assert.match(app, /min-height:44px/);
  assert.match(app, /--max:820px/);
  assert.match(app, /drawer-backdrop/);
  assert.match(app, /@media\(max-width:900px\)/);
  assert.match(app, /@media\(max-width:540px\)/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('app keeps useful local state for chats and model selection', () => {
  assert.match(app, /localStorage/);
  assert.match(app, /stellar-chat-sessions:/);
  assert.match(app, /stellar-selected-model/);
  assert.match(app, /data-model="/);
  assert.match(app, /function selectModel\(/);
  assert.match(app, /function saveSessions\(\)/);
});
