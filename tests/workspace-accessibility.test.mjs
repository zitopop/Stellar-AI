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

test('Task 166 keeps the model-menu plan action an explicit non-submit menu button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="closeModelMenu\(\); openPlans\(\)" role="menuitem" class="w-full text-left px-3 py-2\.5 rounded-xl hover:bg-white\/10 font-black text-sm">⭐ See all plans<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="closeModelMenu\(\); openPlans\(\)" role="menuitem"/);
});

test('Task 167 keeps the New Chat sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="newChat\(\)" class="side-new w-full mb-4 transition-all active:scale-\[0\.985\]">\s*New Chat\s*<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="newChat\(\)" class="side-new/);
});
