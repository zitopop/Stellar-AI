import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workspaceHtml = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Task 164 keeps chat-history options controls touch-safe and semantically connected', () => {
  assert.match(workspaceHtml, /\.chat-dots \{ flex: none; width: 44px; height: 44px; border-radius: 12px;/);
  assert.doesNotMatch(workspaceHtml, /\.chat-dots \{ flex: none; width: 24px; height: 24px;/);
  assert.match(workspaceHtml, /aria-label="Chat options" aria-haspopup="menu" aria-controls="chat-menu" aria-expanded="false" class="chat-dots"/);
  assert.match(workspaceHtml, /<div id="chat-menu" class="hidden" role="menu" aria-label="Chat options" aria-hidden="true"><\/div>/);
});
