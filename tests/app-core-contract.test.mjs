import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app page is not empty and exposes the core chat workspace', () => {
  assert.ok(app.length > 15000, 'app.html should contain the real app shell, not an empty file');
  assert.match(app, /<title>Stellar AI Workspace<\/title>|<title>Stellar AI App<\/title>/);
  assert.match(app, /id="chatForm"/);
  assert.match(app, /id="prompt"/);
  assert.match(app, /id="sendBtn"/);
  assert.match(app, /fetch\('\/api\/chat'/);
  assert.match(app, /Thinking/);
  assert.match(app, /Send failed/);
});

test('app exposes deliberate user controls and owner-gated coding agents', () => {
  for (const text of ['New chat', 'Models', 'Settings', 'Account', 'Plan and usage']) {
    assert.match(app, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(app, /Use wallet credit after included allowance/);
  assert.match(app, /Overage credit is opt-in/);
  assert.match(app, /No saved chats yet/);
  assert.match(app, /id="desktop-agent-nav"/);
  assert.match(app, /id="roblox-studio-nav"/);
  assert.match(app, /owner-only/);
  assert.match(app, /id="composer-more"/);
  assert.doesNotMatch(app, /<p class="side-title">Agents<\/p>/);
  assert.doesNotMatch(app, /id="account-box"/);
});

test('app includes mobile-safe layout rules and tap targets', () => {
  assert.match(app, /min-width:320px/);
  assert.match(app, /overflow-x:hidden/);
  assert.match(app, /min-height:44px/);
  assert.match(app, /--max:860px/);
  assert.match(app, /drawer-backdrop/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('app keeps useful local state without pretending work is already saved', () => {
  assert.match(app, /localStorage/);
  assert.match(app, /stellar-first-signin-onboarding-v1-/);
  assert.match(app, /model-menu/);
  assert.match(app, /data-model-choice/);
  assert.match(app, /setModel/);
});
