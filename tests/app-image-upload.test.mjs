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

test('Task 79 closes an open workspace drawer with Escape and restores Files control focus', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key !== 'Escape'\) return;\s+const workspace = document\.getElementById\('workspace'\);\s+if \(!workspace \|\| workspace\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+toggleWorkspace\(\);\s+document\.getElementById\('ws-btn'\)\?\.focus\(\{ preventScroll: true \}\);/);
});

test('Task 80 gives the sign-in modal an explicit labelled modal-dialog role', () => {
  assert.match(appHtml, /<div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-modal-heading">\s+<h2 id="welcome-modal-heading" class="sr-only">Account access<\/h2>/);
});

test('Task 81 manages focus when the sign-in dialog opens and is explicitly dismissed', () => {
  assert.match(appHtml, /let welcomeTrigger = null;\s+function focusWelcomeDialog\(\) \{\s+setTimeout\(\(\) => document\.getElementById\('si-email'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function openWelcome\(\) \{\s+const active = document\.activeElement;\s+welcomeTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;[\s\S]*?focusWelcomeDialog\(\);/);
  assert.match(appHtml, /function dismissWelcome\(\) \{[\s\S]*?const trigger = welcomeTrigger;\s+welcomeTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);/);
});

test('Task 82 closes an open sign-in dialog with Escape through the existing dismissal path', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+const welcomeModal = document\.getElementById\('welcome-modal'\);\s+if \(!welcomeModal \|\| welcomeModal\.classList\.contains\('hidden'\)\) return;[\s\S]*?if \(event\.key !== 'Escape'\) return;\s+event\.preventDefault\(\);\s+dismissWelcome\(\);/);
});

test('Task 83 gives the plans, usage, and settings modal cards explicit labelled dialog semantics', () => {
  assert.match(appHtml, /role="dialog" aria-modal="true" aria-labelledby="plans-modal-heading"[\s\S]*?id="plans-modal-heading"[\s\S]*?>Choose your plan<\//);
  assert.match(appHtml, /role="dialog" aria-modal="true" aria-labelledby="settings-modal-heading" class="set-card[\s\S]*?id="settings-modal-heading" class="settings-title">Settings<\//);
  assert.match(appHtml, /role="dialog" aria-modal="true" aria-labelledby="usage-modal-heading"[\s\S]*?id="usage-modal-heading"[\s\S]*?>Plan usage limits<\//);
});

test('Task 84 gives every scoped utility-dialog close control a specific accessible name', () => {
  assert.match(appHtml, /<button id="plans-modal-close" onclick="closePlans\(\)" class="modal-x" aria-label="Close plans">×<\/button>/);
  assert.match(appHtml, /<button id="settings-modal-close" onclick="closeSettings\(\)" class="modal-x" aria-label="Close settings" title="Close settings">×<\/button>/);
  assert.match(appHtml, /<button id="usage-modal-close" onclick="closeUsage\(\)" aria-label="Close usage limits" title="Close usage limits"/);
});

test('Task 85 closes the open plans, usage, or settings dialog with Escape without overriding an earlier handler', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{[\s\S]*?if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const openUtilityDialog = \[\s+\['settings-modal', closeSettings\],\s+\['usage-modal', closeUsage\],\s+\['plans-modal', closePlans\],\s+\]\.find\(\(\[id\]\) => !document\.getElementById\(id\)\?\.classList\.contains\('hidden'\)\);\s+if \(!openUtilityDialog\) return;\s+event\.preventDefault\(\);\s+openUtilityDialog\[1\]\(\);/);
});

test('Task 86 manages close-control and trigger focus for scoped utility dialogs', () => {
  assert.match(appHtml, /let utilityDialogTrigger = null;\s+function captureUtilityDialogTrigger\(\) \{[\s\S]*?utilityDialogTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;/);
  assert.match(appHtml, /function focusUtilityDialogClose\(id\) \{\s+setTimeout\(\(\) => document\.getElementById\(id\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function restoreUtilityDialogFocus\(\) \{[\s\S]*?utilityDialogTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);/);
  assert.match(appHtml, /function openPlans\(\) \{ captureUtilityDialogTrigger\(\);[\s\S]*?focusUtilityDialogClose\('plans-modal-close'\);/);
  assert.match(appHtml, /captureUtilityDialogTrigger\(\); renderUsagePage\(\);[\s\S]*?focusUtilityDialogClose\('usage-modal-close'\);/);
  assert.match(appHtml, /function openSettings\(\) \{\s+captureUtilityDialogTrigger\(\);[\s\S]*?focusUtilityDialogClose\('settings-modal-close'\);/);
  assert.match(appHtml, /function closePlans\(\) \{[\s\S]*?restoreUtilityDialogFocus\(\);/);
  assert.match(appHtml, /function closeUsage\(\) \{[\s\S]*?restoreUtilityDialogFocus\(\);/);
  assert.match(appHtml, /function closeSettings\(\) \{[\s\S]*?restoreUtilityDialogFocus\(\);/);
});

test('Task 87 gives sign-in and sign-up credential fields explicit accessible names while preserving autocomplete', () => {
  assert.match(appHtml, /id="si-email"[^>]*aria-label="Email address"[^>]*autocomplete="email"/);
  assert.match(appHtml, /id="si-pass"[^>]*aria-label="Password"[^>]*autocomplete="current-password"/);
  assert.match(appHtml, /id="su-email"[^>]*aria-label="Email address"[^>]*autocomplete="email"/);
  assert.match(appHtml, /id="su-pass"[^>]*aria-label="Choose a password"[^>]*autocomplete="new-password"/);
});

test('Task 88 focuses the active authentication page email field after switching pages', () => {
  assert.match(appHtml, /function authPage\(which\) \{[\s\S]*?const login = which === 'login';[\s\S]*?setTimeout\(\(\) => document\.getElementById\(login \? 'si-email' : 'su-email'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
});

test('Task 89 keeps Tab navigation inside the open sign-in dialog', () => {
  assert.match(appHtml, /function trapWelcomeDialogFocus\(event, welcomeModal\) \{\s+if \(event\.key !== 'Tab'\) return;[\s\S]*?\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /if \(event\.key === 'Tab'\) \{\s+trapWelcomeDialogFocus\(event, welcomeModal\);\s+return;\s+\}/);
});

test('Task 90 keeps Tab navigation inside the open plans, usage, or settings dialog', () => {
  assert.match(appHtml, /function trapOpenUtilityDialogFocus\(event\) \{\s+if \(event\.key !== 'Tab'\) return;\s+const utilityDialog = \['settings-modal', 'usage-modal', 'plans-modal'\][\s\S]*?\.querySelector\('\[role="dialog"\]'\);[\s\S]*?\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key === 'Tab'\) \{\s+if \(!event\.defaultPrevented\) trapOpenUtilityDialogFocus\(event\);\s+return;\s+\}/);
});

test('Task 91 gives sign-in and sign-up feedback polite atomic live-status semantics', () => {
  assert.match(appHtml, /<div id="si-msg" class="redeem-msg" role="status" aria-live="polite" aria-atomic="true"><\/div>/);
  assert.match(appHtml, /<div id="su-msg" class="redeem-msg" role="status" aria-live="polite" aria-atomic="true"><\/div>/);
});

test('Task 92 gives the remaining symbol-only workspace controls specific accessible names', () => {
  assert.match(appHtml, /<button onclick="clearPaste\(\)" class="paste-x" aria-label="Remove pasted content" title="Remove pasted content">×<\/button>/);
  assert.match(appHtml, /<button onclick="closeOwner\(\)" class="modal-x" aria-label="Close owner tools">×<\/button>/);
});

test('Task 93 gives the owner-tools modal explicit labelled dialog semantics', () => {
  assert.match(appHtml, /<div class="glass rounded-3xl w-full max-w-md mx-4 p-6 thanks-card" role="dialog" aria-modal="true" aria-labelledby="owner-modal-heading">/);
  assert.match(appHtml, /<div id="owner-modal-heading" class="text-2xl font-black">👑 Owner tools<\/div>/);
});
