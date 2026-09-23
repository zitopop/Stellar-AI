import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app page is not empty and exposes the core chat workspace', () => {
  assert.ok(app.length > 15000, 'app.html should contain the real app shell, not an empty file');
  assert.match(app, /<title>Stellar AI App<\/title>/);
  assert.match(app, /id="chatForm"/);
  assert.match(app, /id="prompt"/);
  assert.match(app, /id="sendBtn"/);
  assert.match(app, /fetch\('\/api\/chat'/);
  assert.match(app, /Thinking…/);
  assert.match(app, /Send failed/);
});

test('app exposes expected user controls without showing owner tools by default', () => {
  for (const text of ['New chat', 'Pin chat', 'Delete chat', 'Rename', 'Models', 'Plans', 'Settings', 'Account']) {
    assert.match(app, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(app, /owner tools hidden/i);
});

test('app includes mobile-safe layout rules and tap targets', () => {
  assert.match(app, /min-width:320px/);
  assert.match(app, /overflow-x:hidden/);
  assert.match(app, /min-height:44px/);
  assert.match(app, /max-width:900px/);
  assert.match(app, /drawer-backdrop/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('app keeps local history and selected model state', () => {
  assert.match(app, /localStorage/);
  assert.match(app, /stellarChats/);
  assert.match(app, /selectedModel/);
  assert.match(app, /model:/);
});
