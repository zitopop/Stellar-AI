import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('Task 49 exposes an accessible validated image-upload control in the workspace composer', () => {
  assert.match(appHtml, /id="image-upload-input"[^>]*type="file"[^>]*accept="image\/png,image\/jpeg,image\/gif,image\/webp"/);
  assert.match(appHtml, /id="image-upload-btn"[^>]*aria-label="Attach an image"/);
  assert.match(appHtml, /id="image-upload-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(appHtml, /const UPLOAD_IMAGE_MAX_BYTES = 3_000_000;/);
  assert.match(appHtml, /const UPLOAD_IMAGE_MEDIA_TYPES = new Set\(\['image\/png', 'image\/jpeg', 'image\/gif', 'image\/webp'\]\);/);
  assert.match(appHtml, /if \(!UPLOAD_IMAGE_MEDIA_TYPES\.has\(file\.type\)\)/);
  assert.match(appHtml, /if \(file\.size > UPLOAD_IMAGE_MAX_BYTES\)/);
  assert.match(appHtml, /let imageUploadRequestId = 0;/);
  assert.match(appHtml, /const uploadRequestId = \+\+imageUploadRequestId;/);
  assert.match(appHtml, /reader\.onload = function\(e\) \{\s+if \(uploadRequestId !== imageUploadRequestId\) return;/);
  assert.match(appHtml, /reader\.onerror = function\(\) \{\s+if \(uploadRequestId !== imageUploadRequestId\) return;/);
  assert.match(appHtml, /function removeImage\(\) \{\s+imageUploadRequestId \+= 1;/);
  assert.match(appHtml, /reader\.onerror = function\(\)/);
  assert.match(appHtml, /const imageItem = Array\.from\(clipboard\?\.items \|\| \[\]\)\.find\(\(item\) => item\.kind === 'file' && item\.type\.startsWith\('image\/'\)\)/);
  assert.match(appHtml, /attachImageFile\(imageFile, null, 'Pasted image'\)/);
  assert.match(appHtml, /if \(imageFile\) \{\s+e\.preventDefault\(\);\s+attachImageFile\(imageFile, null, 'Pasted image'\);\s+return;\s+\}\s+\}\s+const t = clipboard\.getData\('text'\);/);
  assert.match(appHtml, /function initImageDrop\(\)/);
  assert.match(appHtml, /composer\.addEventListener\('drop', \(event\) => \{[\s\S]*?const droppedFile = Array\.from\(event\.dataTransfer\?\.files \|\| \[\]\)\[0\];[\s\S]*?event\.preventDefault\(\);\s+attachImageFile\(droppedFile, null, 'Dropped image'\);/);
  assert.match(appHtml, /initPaste\(\);\s+initImageDrop\(\);/);
});

test('Task 67 keeps IME composition intact while documenting composer keyboard behavior', () => {
  assert.match(appHtml, /id="txt"[^>]*aria-label="Message composer\. Press Enter to send and Shift\+Enter for a new line\."/);
  assert.match(appHtml, /onkeydown="if \(event\.key === 'Enter' && !event\.shiftKey && !event\.isComposing\) \{ event\.preventDefault\(\); if \(!currentAbort\) sendMessage\(\); \}"/);
});

test('Task 68 exposes a visible desktop keyboard hint without squashing mobile controls', () => {
  assert.match(appHtml, /id="keyboard-hint" class="keyboard-hint">Enter to send · Shift\+Enter for new line<\/span>/);
  assert.match(appHtml, /\.keyboard-hint \{ color: rgba\(226,217,255,0\.58\);/);
  assert.match(appHtml, /body\.light \.keyboard-hint \{ color: #6b7280; \}/);
  assert.match(appHtml, /@media \(max-width: 640px\) \{\s+\.composer-foot \{ gap: 6px; justify-content: flex-start; \}\s+\.keyboard-hint \{ display: none; \}/);
});

test('Task 69 exposes live generation status for thinking, completion, stop, and failure outcomes', () => {
  assert.match(appHtml, /id="generation-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(appHtml, /function setGenerationStatus\(label\)/);
  assert.match(appHtml, /setGenerationStatus\(STEPS\[0\]\[1\]\);/);
  assert.match(appHtml, /setGenerationStatus\('Generation completed\.'\);/);
  assert.match(appHtml, /setGenerationStatus\('Generation stopped\.'\);/);
  assert.match(appHtml, /setGenerationStatus\('Generation failed: ' \+ msg\);/);
});

test('Task 70 marks the workspace chat busy only while generation is active', () => {
  assert.match(appHtml, /<main id="chat" class="flex-1 overflow-y-auto p-6" aria-busy="false">/);
  assert.match(appHtml, /const chatEl = document\.getElementById\('chat'\);\s+chatEl\.setAttribute\('aria-busy', 'true'\);/);
  assert.match(appHtml, /setGenerationStatus\('Command completed\.'\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);/);
  assert.match(appHtml, /setGenerationStatus\('Image request completed\.'\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);/);
  assert.match(appHtml, /loading\.remove\(\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);\s+setSendControl\('Send', 'Send message'\);/);
});

test('Task 71 keeps the send control’s accessible name synchronized with send and stop states', () => {
  assert.match(appHtml, /id="send-btn"[^>]*aria-label="Send message"[^>]*title="Send message"/);
  assert.match(appHtml, /function setSendControl\(label, ariaLabel\) \{[\s\S]*?button\.setAttribute\('aria-label', ariaLabel\);[\s\S]*?button\.title = ariaLabel;/);
  assert.match(appHtml, /setSendControl\('◼ Stop', 'Stop generating response'\);/);
  assert.match(appHtml, /setSendControl\('Send', 'Send message'\);/);
});

test('Task 72 restores keyboard focus after local completion only when the send control still owns focus', () => {
  assert.match(appHtml, /function restoreComposerFocusIfSendControlFocused\(\) \{[\s\S]*?document\.activeElement !== button[\s\S]*?document\.getElementById\('txt'\)\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(appHtml, /setGenerationStatus\('Command completed\.'\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);\s+restoreComposerFocusIfSendControlFocused\(\);/);
  assert.match(appHtml, /setGenerationStatus\('Image request completed\.'\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);\s+loadChat\(currentChatId\);\s+restoreComposerFocusIfSendControlFocused\(\);/);
});

test('Task 73 gives the active stop control enough narrow-screen width to keep its label visible', () => {
  assert.match(appHtml, /#send-btn\.is-stop \{ flex-basis: 88px !important; width: 88px !important; min-width: 88px !important; padding-inline: 10px !important; white-space: nowrap; \}/);
  assert.match(appHtml, /button\.classList\.toggle\('is-stop', label === '◼ Stop'\);/);
});

test('Task 74 restores guarded composer focus after standard generation cleanup', () => {
  assert.match(appHtml, /loading\.remove\(\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);\s+setSendControl\('Send', 'Send message'\);\s+document\.getElementById\('logo-star'\)\.classList\.remove\('logo-working'\);\s+restoreComposerFocusIfSendControlFocused\(\);/);
});

test('Task 75 announces a requested stop before aborting the active generation', () => {
  assert.match(appHtml, /function stopOrSend\(\) \{\s+if \(currentAbort\) \{\s+setGenerationStatus\('Stopping generation\.'\);\s+currentAbort\.abort\(\);\s+return;/);
});

test('Task 76 exposes the mobile navigation toggle name and expanded state', () => {
  assert.match(appHtml, /id="mobile-menu-toggle"[^>]*aria-label="Open navigation"[^>]*aria-expanded="false"[^>]*aria-controls="sidebar"/);
  assert.match(appHtml, /const toggle = document\.getElementById\('mobile-menu-toggle'\);\s+if \(toggle\) \{\s+toggle\.setAttribute\('aria-expanded', String\(opening\)\);\s+toggle\.setAttribute\('aria-label', opening \? 'Close navigation' : 'Open navigation'\);/);
});

test('Task 77 gives the workspace drawer close control an explicit accessible name', () => {
  assert.match(appHtml, /<button onclick="toggleWorkspace\(\)" aria-label="Close workspace" title="Close workspace" class="ws-close">×<\/button>/);
});

test('Task 78 synchronizes the Files control expanded state with the workspace drawer', () => {
  assert.match(appHtml, /id="ws-btn" aria-expanded="false" aria-controls="workspace" class="ws-toggle"/);
  assert.match(appHtml, /function toggleWorkspace\(\) \{\s+const ws = document\.getElementById\('workspace'\);\s+const opening = ws\.classList\.contains\('hidden'\);\s+ws\.classList\.toggle\('hidden'\);\s+document\.getElementById\('ws-btn'\)\?\.setAttribute\('aria-expanded', String\(opening\)\);/);
});
