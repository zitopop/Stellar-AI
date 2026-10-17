import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('New chat is the first visible sidebar action, before account links', () => {
  const sidebar = app.match(/<aside class="side"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(sidebar, 'Sidebar must exist');
  const newChat = sidebar.indexOf('id="newChatBtn"');
  const account = sidebar.indexOf('class="side-account"');
  assert.ok(newChat !== -1, 'New chat button must exist');
  assert.ok(account !== -1, 'Account footer must exist');
  assert.ok(newChat < account, 'New chat should be above bottom account links');
  assert.equal((sidebar.match(/id="newChatBtn"/g) || []).length, 1, 'Only one New chat button');
});

test('Minimal sidebar still exposes settings and terms at bottom', () => {
  assert.match(app, /id="stellar-sidebar-new-chat-only-v58"/);
  assert.match(app, /class="side-account" aria-label="Account links"/);
  assert.match(app, /data-open="settings" aria-label="Open settings"/);
  assert.match(app, /href="\/terms" aria-label="Open terms"/);
});
