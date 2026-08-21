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

test('Task 165 keeps generated chat-menu actions explicit non-submit buttons', () => {
  const menuActions = workspaceHtml.match(/<button type="button" role="menuitem"(?: class="cm-danger")? onclick=/g) ?? [];
  assert.equal(menuActions.length, 3);
  assert.match(workspaceHtml, /menu\.innerHTML =\s*'[\s\S]*type="button" role="menuitem" onclick="closeChatMenu\(\); togglePin/);
  assert.match(workspaceHtml, /type="button" role="menuitem" onclick="closeChatMenu\(\); renameChat/);
  assert.match(workspaceHtml, /type="button" role="menuitem" class="cm-danger" onclick="closeChatMenu\(\); deleteChat/);
});
