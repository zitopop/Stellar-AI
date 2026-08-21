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

test('Task 168 keeps the signed-out Sign in sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="openWelcome\(\)" class="acct-signin-btn">Sign in<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="openWelcome\(\)" class="acct-signin-btn">/);
});

test('Task 169 keeps the signed-in Sign out sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="signOut\(\)" class="acct-out-btn" title="Sign out">Sign out<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="signOut\(\)" class="acct-out-btn"/);
});

test('Task 170 keeps the Credit sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="openUsage\(\)" class="side-act side-act-key"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-card"\/><\/svg><\/span>Credit<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="openUsage\(\)" class="side-act side-act-key">/);
});

test('Task 171 keeps the Plans sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="openPlans\(\)" class="side-act side-act-key"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-gem"\/><\/svg><\/span>Plans<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="openPlans\(\)" class="side-act side-act-key">/);
});

test('Task 172 keeps the Theme sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" id="side-theme-toggle" onclick="toggleDarkMode\(\)" class="side-act" aria-pressed="false" aria-label="Switch to light theme">/);
  assert.match(workspaceHtml, /const themeToggle = document\.getElementById\('side-theme-toggle'\);[\s\S]*?themeToggle\.setAttribute\('aria-pressed', String\(light\)\)/);
  assert.doesNotMatch(workspaceHtml, /<button\s+id="side-theme-toggle"\s+onclick="toggleDarkMode\(\)"/);
});

test('Task 173 keeps the Settings sidebar control an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="openSettings\(\)" class="side-act"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-cog"\/><\/svg><\/span>Settings<\/button>/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="openSettings\(\)" class="side-act">/);
});

test('Task 174 keeps every model chooser selection an explicit non-submit menuitemradio button', () => {
  for (const model of ['fabie', 'smart', 'comet', 'ultra', 'researcher', 'security', 'tester']) {
    assert.match(workspaceHtml, new RegExp(`<button(?: type="button")?[^>]*data-model-choice="${model}"[^>]*role="menuitemradio"`));
    assert.match(workspaceHtml, new RegExp(`<button type="button"[^>]*data-model-choice="${model}"`));
  }
  assert.match(workspaceHtml, /document\.querySelectorAll\('\[data-model-choice\]'\)\.forEach\(\(choice\) => \{[\s\S]*?choice\.setAttribute\('aria-checked', String\(choice\.dataset\.modelChoice === cur\)\)/);
});

test('Task 175 keeps composer utility and Send controls explicit non-submit buttons', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="clearPaste\(\)" class="paste-x" aria-label="Remove pasted content" title="Remove pasted content">×<\/button>/);
  assert.match(workspaceHtml, /<button type="button" id="send-btn" onclick="stopOrSend\(\)" aria-label="Send message" title="Send message" class="primary-btn/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="clearPaste\(\)" class="paste-x"/);
  assert.doesNotMatch(workspaceHtml, /<button id="send-btn" onclick="stopOrSend\(\)"/);
});

test('Task 176 keeps composer Credit and Files controls explicit non-submit buttons', () => {
  assert.match(workspaceHtml, /<button type="button" onclick="openUsage\(\)" id="credits-btn" class="ws-toggle credits-btn">/);
  assert.match(workspaceHtml, /<button type="button" onclick="toggleWorkspace\(\)" id="ws-btn" aria-expanded="false" aria-controls="workspace" class="ws-toggle">/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="openUsage\(\)" id="credits-btn"/);
  assert.doesNotMatch(workspaceHtml, /<button onclick="toggleWorkspace\(\)" id="ws-btn"/);
});
