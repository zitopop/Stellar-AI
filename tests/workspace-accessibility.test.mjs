import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace navigation and composer expose stable accessible names', () => {
  assert.match(app, /aria-label="Stellar app sidebar"/);
  assert.match(app, /id="saved-chat-list"[^>]*aria-label="Saved chats"/);
  assert.match(app, /<form id="chatForm" class="composer" aria-label="Message composer">/);
  assert.match(app, /id="sendBtn"[^>]*aria-label="Send message"/);
  assert.match(app, /id="image-upload-status"[^>]*aria-live="polite"/);
});

test('interactive controls keep explicit button types and touch targets', () => {
  assert.match(app, /onclick="newChat\(\)">New chat<\/button>/);
  assert.match(app, /onclick="openSettings\(\)"/);
  assert.match(app, /id="image-upload-btn"[^>]*type="button"/);
  assert.match(app, /\.btn\{min-height:44px/);
});

test('account and settings surfaces are mobile safe', () => {
  assert.match(app, /id="welcome-modal" role="dialog" aria-modal="true"/);
  assert.match(app, /id="settings-panel" class="settings-panel" aria-hidden="true"/);
  assert.match(app, /@media \(max-width: 520px\)[\s\S]*?max-height:90dvh/);
});

test('model chooser remains bounded and scrollable', () => {
  assert.match(app, /#model-menu\{[\s\S]*?overflow:auto/);
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?#model-menu\{left:12px;right:12px/);
});

test('reduced motion is respected', () => {
  assert.match(app, /prefers-reduced-motion:reduce/);
});
