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

test('generation retries one transient empty attempt with a clear checking-again status', () => {
  assert.match(appHtml, /function isRetryableGenerationFailure\(error\)/);
  assert.match(appHtml, /async function sendMessage\(retryContext = null\)/);
  assert.match(appHtml, /const isRetry = Boolean\(retryContext\?\.text\);/);
  assert.match(appHtml, /if \(!isRetry\) \{/);
  assert.match(appHtml, /else if \(!isRetry && !full && isRetryableGenerationFailure\(error\)\)/);
  assert.match(appHtml, /That attempt did not complete — checking again…/);
  assert.match(appHtml, /window\.setTimeout\(\(\) => sendMessage\(\{ text \}\), 450\)/);
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
  assert.match(appHtml, /<main id="chat" class="flex-1 overflow-y-auto p-6" aria-label="Chat conversation" aria-busy="false">/);
  assert.match(appHtml, /const chatEl = document\.getElementById\('chat'\);\s+chatEl\.setAttribute\('aria-busy', 'true'\);/);
  assert.match(appHtml, /setGenerationStatus\('Command completed\.'\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);/);
  assert.match(appHtml, /setGenerationStatus\('Image request completed\.'\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);/);
  assert.match(appHtml, /loading\.remove\(\);\s+chatEl\.setAttribute\('aria-busy', 'false'\);\s+setSendControl\('Send', 'Send message'\);/);
});

test('Task 134 gives the existing workspace chat region a stable accessible name', () => {
  assert.match(appHtml, /<main id="chat" class="flex-1 overflow-y-auto p-6" aria-label="Chat conversation" aria-busy="false">/);
  assert.match(appHtml, /chatEl\.setAttribute\('aria-busy', 'true'\);/);
});

test('Task 135 exposes the existing workspace composer as a named form landmark', () => {
  assert.match(appHtml, /<div class="input-area p-6 glass border-t border-white\/10" role="form" aria-label="Message composer">/);
  assert.match(appHtml, /id="txt" rows="1" autofocus placeholder="Ask Stellar…" aria-label="Message composer\. Press Enter to send and Shift\+Enter for a new line\."/);
  assert.match(appHtml, /id="send-btn" onclick="stopOrSend\(\)" aria-label="Send message"/);
});

test('Task 154 accepts only named landing starters and pre-fills a non-persistent editable composer prompt', () => {
  assert.match(appHtml, /const LANDING_STARTER_PROMPTS = Object\.freeze\(\{/);
  for (const key of ['police', 'heist', 'fix', 'roblox']) {
    assert.match(appHtml, new RegExp(`${key}: '`));
  }
  assert.match(appHtml, /function applyLandingStarterPrompt\(\) \{[\s\S]*?const starterPrompt = LANDING_STARTER_PROMPTS\[starterKey\];[\s\S]*?if \(!starterPrompt\) return;/);
  assert.match(appHtml, /params\.delete\('starter'\);/);
  assert.match(appHtml, /input\.value = starterPrompt;[\s\S]*?input\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\);/);
  assert.match(appHtml, /setGenerationStatus\('Starter prompt ready to edit\.'\);/);
  assert.match(appHtml, /applyWelcomeEntry\(\);\s+maybeShowWelcome\(\);\s+applyLandingStarterPrompt\(\);/);
});

test('Task 155 focuses a landing starter only after guest continuation, preserving explicit welcome-dialog trigger restoration', () => {
  assert.match(appHtml, /let landingStarterFocusPending = false;/);
  assert.match(appHtml, /function focusLandingStarterComposer\(\) \{[\s\S]*?landingStarterFocusPending = false;[\s\S]*?input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(appHtml, /if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);\s+else if \(landingStarterFocusPending\) focusLandingStarterComposer\(\);/);
  assert.match(appHtml, /landingStarterFocusPending = true;\s+if \(document\.getElementById\('welcome-modal'\)\.classList\.contains\('hidden'\)\) focusLandingStarterComposer\(\);/);
});

test('Task 159 removes a closed mobile sidebar from the accessibility tree without hiding desktop navigation', () => {
  assert.match(appHtml, /function syncSidebarAccessibility\(\) \{\s+const sidebar = document\.getElementById\('sidebar'\);\s+if \(!sidebar\) return;\s+const isMobile = window\.matchMedia\('\(max-width: 767px\)'\)\.matches;\s+const mobileSidebarIsClosed = isMobile && !sidebar\.classList\.contains\('open'\);\s+sidebar\.setAttribute\('aria-hidden', String\(mobileSidebarIsClosed\)\);/);
  assert.match(appHtml, /syncSidebarAccessibility\(\);\s+\}\s+\s+window\.addEventListener\('resize', syncSidebarAccessibility\);/);
  assert.match(appHtml, /updateSignedOutHint\(\);\s+syncSidebarAccessibility\(\);\s+applyWelcomeEntry\(\);\s+maybeShowWelcome\(\);/);
});

test('Task 160 gives the existing redeem-code field an explicit accessible name', () => {
  assert.match(appHtml, /<input id="redeem-input" class="redeem-input" placeholder="STELLAR-XXXXXX-XXX-XXXX" aria-label="Gift code" autocomplete="off">/);
  assert.match(appHtml, /<button onclick="doRedeem\(\)" class="side-new w-full mt-3">Redeem<\/button>/);
});

test('Task 161 synchronizes the existing sidebar toggle state for desktop collapse and mobile drawer modes', () => {
  assert.match(appHtml, /const navigationIsExpanded = isMobile \? !mobileSidebarIsClosed : !sidebar\.classList\.contains\('collapsed'\);/);
  assert.match(appHtml, /toggle\.setAttribute\('aria-expanded', String\(navigationIsExpanded\)\);\s+toggle\.setAttribute\('aria-label', isMobile\s+\? \(navigationIsExpanded \? 'Close navigation' : 'Open navigation'\)\s+\: \(navigationIsExpanded \? 'Collapse navigation' : 'Expand navigation'\)\);/);
});

test('Task 136 announces the existing pasted-content summary politely', () => {
  assert.match(appHtml, /<div class="paste-title" id="paste-chip-text" role="status" aria-live="polite" aria-atomic="true">Pasted content<\/div>/);
  assert.match(appHtml, /document\.getElementById\('paste-chip-text'\)\.textContent = label;/);
  assert.match(appHtml, /document\.getElementById\('paste-chip'\)\.classList\.remove\('hidden'\);/);
  assert.match(appHtml, /function clearPaste\(\) \{\s+pastedBlock = null;\s+document\.getElementById\('paste-chip'\)\.classList\.add\('hidden'\);/);
});

test('Task 137 exposes the existing workspace sidebar as named navigation', () => {
  assert.match(appHtml, /<div id="sidebar" class="w-72 glass border-r border-white\/10 flex flex-col p-4" role="navigation" aria-label="Workspace navigation">/);
  assert.match(appHtml, /<button type="button" onclick="newChat\(\)" class="side-new w-full mb-4 transition-all active:scale-\[0\.985\]">/);
  assert.match(appHtml, /<input id="search" oninput="renderChatList\(\)"/);
  assert.match(appHtml, /<div class="flex-1 overflow-y-auto" id="chats-list"(?: role="region" aria-labelledby="chats-heading")?><\/div>/);
});

test('Task 138 gives workspace chat search an explicit accessible name', () => {
  assert.match(appHtml, /<input id="search" oninput="renderChatList\(\)" placeholder="&#128269; Search chats" aria-label="Search chats"/);
  assert.match(appHtml, /autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" name="search_stellar_20607">/);
});

test('Task 139 relates the existing workspace chat-history label and list', () => {
  assert.match(appHtml, /<div id="chats-heading" class="chats-label" role="heading" aria-level="2">Chats<\/div>/);
  assert.match(appHtml, /<div class="flex-1 overflow-y-auto" id="chats-list" role="region" aria-labelledby="chats-heading"><\/div>/);
  assert.match(appHtml, /const container = document\.getElementById\('chats-list'\);\s+container\.innerHTML = '';/);
});

test('Task 142 makes existing chat-history items keyboard-operable with current-chat context', () => {
  assert.match(appHtml, /\.chat-open:focus-visible \{\s+outline: 3px solid rgba\(105,229,193,\.9\);\s+outline-offset: 3px;/);
  assert.match(appHtml, /const currentAttribute = isCurrent \? ' aria-current="page"' : '';/);
  assert.match(appHtml, /<button type="button" class="chat-open flex-1 min-w-0" onclick="loadChat\('\$\{chat\.id\}'\)" aria-label="Open chat: \$\{escapeHtml\(chatLabel\)\}"\$\{currentAttribute\}>/);
  assert.match(appHtml, /<button onclick="event\.stopPropagation\(\); openChatMenu\(event, '\$\{chat\.id\}'\)" title="Options"(?: aria-label="Chat options" aria-haspopup="menu" aria-controls="chat-menu" aria-expanded="false")? class="chat-dots">⋯<\/button>/);
});

test('Task 143 gives existing chat Options popups menu semantics and keyboard control', () => {
  assert.match(appHtml, /<div id="chat-menu" class="hidden" role="menu" aria-label="Chat options" aria-hidden="true"><\/div>/);
  assert.match(appHtml, /aria-label="Chat options" aria-haspopup="menu" aria-controls="chat-menu" aria-expanded="false" class="chat-dots">⋯<\/button>/);
  assert.match(appHtml, /let chatMenuFor = null;\s+let chatMenuTrigger = null;/);
  assert.match(appHtml, /<button type="button" role="menuitem" onclick="closeChatMenu\(\); togglePin\(/);
  assert.match(appHtml, /menu\.setAttribute\('aria-hidden', 'false'\);/);
  assert.match(appHtml, /if \(event\.key === 'Escape'\)/);
  assert.match(appHtml, /event\.key === 'ArrowDown' \|\| event\.key === 'ArrowUp'/);
});

test('Task 133 prevents the visual thinking bubble from duplicating the existing live generation status', () => {
  assert.match(appHtml, /id="generation-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(appHtml, /loading\.innerHTML = '<div class="think-bubble" aria-hidden="true"><div class="think-spinner"><\/div><div class="think-status" id="think-status">' \+ STEPS\[0\]\[1\] \+ '<\/div><\/div>';/);
  assert.match(appHtml, /setGenerationStatus\(STEPS\[0\]\[1\]\);/);
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
  assert.match(appHtml, /const navigationIsExpanded = isMobile \? !mobileSidebarIsClosed : !sidebar\.classList\.contains\('collapsed'\);/);
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
  assert.match(appHtml, /let welcomeTrigger = null;\s+let landingStarterFocusPending = false;\s+function focusLandingStarterComposer\(\) \{[\s\S]*?\}\s+function focusWelcomeDialog\(\) \{\s+setTimeout\(\(\) => document\.getElementById\('si-email'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function openWelcome\(\) \{\s+const active = document\.activeElement;\s+welcomeTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;[\s\S]*?focusWelcomeDialog\(\);/);
  assert.match(appHtml, /function dismissWelcome\(\) \{[\s\S]*?const trigger = welcomeTrigger;\s+welcomeTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);/);
});

test('Task 82 closes an open sign-in dialog with Escape through the existing dismissal path', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+const welcomeModal = document\.getElementById\('welcome-modal'\);\s+if \(!welcomeModal \|\| welcomeModal\.classList\.contains\('hidden'\)\) return;[\s\S]*?if \(event\.key !== 'Escape'\) return;\s+event\.preventDefault\(\);\s+dismissWelcome\(\);/);
});

test('Settings keeps essential controls visible and secondary sections collapsible', () => {
  assert.match(appHtml, /id="settings-modal-heading" class="settings-title">Settings<\/div>/);
  assert.doesNotMatch(appHtml, /Workspace preferences/);
  assert.doesNotMatch(appHtml, /Make Stellar feel right for the way you build\./);
  assert.match(appHtml, /#settings-modal #set-name-row, #settings-modal #set-email-row \{ display: none !important; \}/);
  assert.match(appHtml, /<details id="set-referral-section" class="set-collapsible"/);
  assert.match(appHtml, /summary>Invite &amp; earn <span aria-hidden="true">＋<\/span>/);
  assert.doesNotMatch(appHtml, /set-skill-tree-section|skill-tree|Builder skill tree/);
  assert.doesNotMatch(appHtml, /id="set-achievements-section"|summary>Achievements/);
});

test('Settings progression remains intentionally simplified without Skill Tree UI', () => {
  assert.doesNotMatch(appHtml, /set-skill-tree|renderSkillTree|skill-tree|Builder skill tree/);
  assert.doesNotMatch(appHtml, /id="set-achievements"|class="achievement-badge/);
  assert.match(appHtml, /id="set-referral-section"/);
  assert.match(appHtml, /id="set-plan-desc"/);
});

test('Task 83 gives the plans, usage, and settings modal cards explicit labelled dialog semantics', () => {
  assert.match(appHtml, /role="dialog" aria-modal="true" aria-labelledby="plans-modal-heading"[\s\S]*?id="plans-modal-heading"[\s\S]*?>Choose your plan<\//);
  assert.match(appHtml, /role="dialog" aria-modal="true" aria-labelledby="settings-modal-heading" class="set-card[\s\S]*?id="settings-modal-heading" class="settings-title">Settings<\//);
  assert.match(appHtml, /role="dialog" aria-modal="true" aria-labelledby="usage-modal-heading"[\s\S]*?id="usage-modal-heading"[\s\S]*?>Usage<\//);
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
  assert.match(appHtml, /<button type="button" onclick="clearPaste\(\)" class="paste-x" aria-label="Remove pasted content" title="Remove pasted content">×<\/button>/);
  assert.match(appHtml, /<button id="owner-modal-close" onclick="closeOwner\(\)" class="modal-x" aria-label="Close owner tools">×<\/button>/);
});

test('Task 93 gives the owner-tools modal explicit labelled dialog semantics', () => {
  assert.match(appHtml, /<div class="glass rounded-3xl w-full max-w-md mx-4 p-6 thanks-card" role="dialog" aria-modal="true" aria-labelledby="owner-modal-heading">/);
  assert.match(appHtml, /<div id="owner-modal-heading" class="text-2xl font-black">👑 Owner tools<\/div>/);
});

test('Task 94 lets keyboard users open owner tools from the settings entry', () => {
  assert.match(appHtml, /<div class="set-item set-click" id="set-owner-row" role="button" tabindex="0" aria-haspopup="dialog" onclick="openOwner\(\)" onkeydown="if \(event\.key === 'Enter' \|\| event\.key === ' '\) \{ event\.preventDefault\(\); openOwner\(\); \}" style="display:none">/);
});

test('Task 95 moves focus into the owner-tools dialog and restores its trigger on close', () => {
  assert.match(appHtml, /<button id="owner-modal-close" onclick="closeOwner\(\)" class="modal-x" aria-label="Close owner tools">×<\/button>/);
  assert.match(appHtml, /let ownerDialogTrigger = null;\s+function openOwner\(\) \{\s+if \(!isOwner\(\)\) return;\s+const active = document\.activeElement;\s+ownerDialogTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;[\s\S]*?setTimeout\(\(\) => document\.getElementById\('owner-modal-close'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function closeOwner\(\) \{\s+document\.getElementById\('owner-modal'\)\.classList\.add\('hidden'\);\s+const trigger = ownerDialogTrigger;\s+ownerDialogTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);\s+\}/);
});

test('Task 96 closes only the open owner-tools dialog with an unhandled Escape key', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{[\s\S]*?if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const ownerModal = document\.getElementById\('owner-modal'\);\s+if \(!ownerModal \|\| ownerModal\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+closeOwner\(\);\s+\}\);/);
});

test('Task 97 keeps Tab navigation inside the open owner-tools dialog', () => {
  assert.match(appHtml, /function trapOwnerDialogFocus\(event\) \{\s+if \(event\.key !== 'Tab'\) return;[\s\S]*?const ownerModal = document\.getElementById\('owner-modal'\);[\s\S]*?\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null && !element\.disabled\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key === 'Tab'\) \{\s+trapOwnerDialogFocus\(event\);\s+return;\s+\}/);
});

test('Task 98 gives the allowance-limit modal explicit labelled dialog semantics', () => {
  assert.match(appHtml, /<div class="glass rounded-3xl w-full max-w-sm mx-4 p-8 text-center thanks-card" role="dialog" aria-modal="true" aria-labelledby="limit-modal-heading">/);
  assert.match(appHtml, /<div id="limit-modal-heading" class="text-2xl font-black mb-2">Allowance used<\/div>/);
});

test('Task 99 manages focus for the allowance-limit dialog lifecycle', () => {
  assert.match(appHtml, /let limitDialogTrigger = null;\s+function captureLimitDialogTrigger\(\) \{\s+const active = document\.activeElement;\s+limitDialogTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;/);
  assert.match(appHtml, /function openLimitDialog\(\) \{\s+document\.getElementById\('limit-modal'\)\.classList\.remove\('hidden'\);\s+setTimeout\(\(\) => document\.querySelector\('#limit-actions button'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function showLimit\(\) \{\s+captureLimitDialogTrigger\(\);/);
  assert.match(appHtml, /function closeLimit\(\) \{\s+document\.getElementById\('limit-modal'\)\.classList\.add\('hidden'\);\s+const trigger = limitDialogTrigger;\s+limitDialogTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);\s+\}/);
});

test('Task 100 closes only the open allowance-limit dialog with an unhandled Escape key', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const limitModal = document\.getElementById\('limit-modal'\);\s+if \(!limitModal \|\| limitModal\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+closeLimit\(\);\s+\}\);/);
});

test('workspace responsive sizing keeps phone and iPad controls usable', () => {
  assert.match(appHtml, /@media \(min-width: 768px\) and \(max-width: 1180px\) \{[\s\S]*?#sidebar \{ width: 220px !important; \}[\s\S]*?#chat \{ width: min\(100%, 720px\) !important;/);
  assert.match(appHtml, /@media \(max-width: 767px\) \{[\s\S]*?#txt \{ min-width: 0 !important; width: 100% !important; min-height: 48px !important;/);
  assert.match(appHtml, /#send-btn \{ flex: 0 0 48px !important; width: 48px !important; min-width: 48px !important; min-height: 48px !important;/);
  assert.match(appHtml, /\.modal-x, #usage-modal-close \{ width: 44px !important; min-width: 44px !important; height: 44px !important; min-height: 44px !important;/);
});

test('Task 101 gives the credit top-up modal explicit labelled dialog semantics', () => {
  assert.match(appHtml, /<div class="glass rounded-3xl w-full max-w-sm mx-4 p-7 text-center thanks-card topup-card" role="dialog" aria-modal="true" aria-labelledby="topup-modal-heading" aria-describedby="topup-modal-note">/);
  assert.match(appHtml, /<div id="topup-modal-heading" class="topup-title">Add credit<\/div>/);
  assert.match(appHtml, /<div id="topup-modal-note" class="topup-sub">Buy once\. Use anytime\.<\/div>/);
});

test('credit top-up modal keeps clean Cancel and close actions visible', () => {
  assert.match(appHtml, /class="topup-close" onclick="closeTopup\(\)" aria-label="Cancel credit purchase">×<\/button>/);
  assert.match(appHtml, /onclick="closeTopup\(\)" class="plan-btn glass w-full mt-2 topup-cancel">Cancel<\/button>/);
});

test('Task 102 manages focus for the credit top-up dialog lifecycle', () => {
  assert.match(appHtml, /let topupDialogTrigger = null;\s+function openTopup\(\) \{\s+const active = document\.activeElement;\s+topupDialogTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;[\s\S]*?setTopupQty\(document\.getElementById\('topup-range'\)\.value\);\s+setTimeout\(\(\) => document\.querySelector\('#topup-modal \.pack'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function closeTopup\(\) \{\s+document\.getElementById\('topup-modal'\)\.classList\.add\('hidden'\);\s+const trigger = topupDialogTrigger;\s+topupDialogTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);\s+\}/);
});

test('Task 103 closes only the open credit top-up dialog with an unhandled Escape key', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const topupModal = document\.getElementById\('topup-modal'\);\s+if \(!topupModal \|\| topupModal\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+closeTopup\(\);\s+\}\);/);
});

test('Task 104 keeps Tab navigation inside the open credit top-up dialog', () => {
  assert.match(appHtml, /function trapTopupDialogFocus\(event\) \{\s+if \(event\.key !== 'Tab'\) return;[\s\S]*?const topupModal = document\.getElementById\('topup-modal'\);[\s\S]*?\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null && !element\.disabled\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /document\.addEventListener\('keydown', trapTopupDialogFocus\);/);
});

test('Task 105 gives the redeem-code modal explicit labelled dialog semantics', () => {
  assert.match(appHtml, /<div class="glass rounded-3xl w-full max-w-sm mx-4 p-7 text-center thanks-card" role="dialog" aria-modal="true" aria-labelledby="redeem-modal-heading">/);
  assert.match(appHtml, /<div id="redeem-modal-heading" class="text-2xl font-black mb-2">Redeem a gift code<\/div>/);
});

test('Task 106 manages focus for the redeem-code dialog lifecycle', () => {
  assert.match(appHtml, /let redeemDialogTrigger = null;\s+function openRedeem\(\) \{\s+const active = document\.activeElement;\s+redeemDialogTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;\s+document\.getElementById\('redeem-modal'\)\.classList\.remove\('hidden'\);\s+setTimeout\(\(\) => document\.getElementById\('redeem-input'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function closeRedeem\(\) \{\s+document\.getElementById\('redeem-modal'\)\.classList\.add\('hidden'\);\s+const trigger = redeemDialogTrigger;\s+redeemDialogTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);\s+\}/);
});

test('Task 107 closes only the open redeem-code dialog with an unhandled Escape key', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const redeemModal = document\.getElementById\('redeem-modal'\);\s+if \(!redeemModal \|\| redeemModal\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+closeRedeem\(\);\s+\}\);/);
});

test('Task 108 keeps Tab navigation inside the open redeem-code dialog', () => {
  assert.match(appHtml, /function trapRedeemDialogFocus\(event\) \{\s+if \(event\.key !== 'Tab'\) return;[\s\S]*?const redeemModal = document\.getElementById\('redeem-modal'\);[\s\S]*?\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null && !element\.disabled\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /document\.addEventListener\('keydown', trapRedeemDialogFocus\);/);
});

test('Task 109 gives the purchase-confirmation modal explicit labelled dialog semantics', () => {
  assert.match(appHtml, /<div class="glass rounded-3xl w-full max-w-sm mx-4 p-8 text-center thanks-card" role="dialog" aria-modal="true" aria-labelledby="thanks-modal-heading">/);
  assert.match(appHtml, /<div id="thanks-modal-heading" class="text-2xl font-black mb-2">Thank you for your purchase<\/div>/);
});

test('Task 110 manages focus for the purchase-confirmation dialog lifecycle', () => {
  assert.match(appHtml, /<button id="thanks-modal-continue" onclick="closeThanks\(\)" class="side-new w-full" style="font-size:12px;padding:8px 12px;">Continue<\/button>/);
  assert.match(appHtml, /let thanksDialogTrigger = null;\s+function openThanksDialog\(\) \{\s+const active = document\.activeElement;\s+thanksDialogTrigger = active instanceof HTMLElement && active !== document\.body \? active : null;\s+document\.getElementById\('thanks-modal'\)\.classList\.remove\('hidden'\);\s+setTimeout\(\(\) => document\.getElementById\('thanks-modal-continue'\)\?\.focus\(\{ preventScroll: true \}\), 0\);/);
  assert.match(appHtml, /function closeThanks\(\) \{\s+document\.getElementById\('thanks-modal'\)\.classList\.add\('hidden'\);\s+const trigger = thanksDialogTrigger;\s+thanksDialogTrigger = null;\s+if \(trigger && trigger\.isConnected\) trigger\.focus\(\{ preventScroll: true \}\);\s+\}/);
  assert.doesNotMatch(appHtml, /document\.getElementById\('thanks-modal'\)\.classList\.remove\('hidden'\);\s+fireConfetti\(\);/);
});

test('Task 111 closes only the open purchase-confirmation dialog with an unhandled Escape key', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const thanksModal = document\.getElementById\('thanks-modal'\);\s+if \(!thanksModal \|\| thanksModal\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+closeThanks\(\);\s+\}\);/);
});

test('Task 112 keeps Tab navigation inside the open purchase-confirmation dialog', () => {
  assert.match(appHtml, /function trapThanksDialogFocus\(event\) \{\s+if \(event\.key !== 'Tab'\) return;[\s\S]*?const thanksModal = document\.getElementById\('thanks-modal'\);[\s\S]*?\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null && !element\.disabled\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /document\.addEventListener\('keydown', trapThanksDialogFocus\);/);
});

test('Task 113 hides the decorative purchase confetti canvas from assistive technologies', () => {
  assert.match(appHtml, /function fireConfetti\(\) \{\s+const c = document\.createElement\('canvas'\);\s+c\.id = 'confetti-canvas';\s+c\.setAttribute\('aria-hidden', 'true'\);/);
});

test('Task 114 gives model choices clear accessible descriptions aligned to routing tiers', () => {
  assert.match(appHtml, /id="model-btn"[^>]*aria-label="Choose model: Star, recommended for most scripts"/);
  assert.match(appHtml, /pickModel\('fabie'\)[^>]*aria-label="Select Spark for fast drafts"[^>]*title="Fast drafts with Claude Haiku"/);
  assert.match(appHtml, /pickModel\('smart'\)[^>]*aria-label="Select Star, recommended for most scripts"[^>]*title="Recommended scripts with Claude Sonnet"/);
  assert.match(appHtml, /pickModel\('ultra'\)[^>]*aria-label="Select Nova for maximum quality, available on Pro"[^>]*title="Maximum quality with Claude Opus, Pro plan"/);
  assert.match(appHtml, /modelButton\.setAttribute\('aria-label', modelLabels\[m\] \|\| modelLabels\.smart\);/);
});

test('Task 115 exposes synchronized disclosure semantics for the model menu', () => {
  assert.match(appHtml, /id="model-btn"[^>]*aria-haspopup="menu"[^>]*aria-controls="model-menu"[^>]*aria-expanded="false"/);
  assert.match(appHtml, /<div id="model-menu" role="menu" aria-label="Choose an AI model"/);
  assert.match(appHtml, /function toggleModelMenu\(e\) \{\s+e\.stopPropagation\(\);\s+refreshModelMenu\(\);\s+const menu = document\.getElementById\('model-menu'\);\s+const willOpen = menu\.classList\.contains\('hidden'\);\s+menu\.classList\.toggle\('hidden', !willOpen\);\s+document\.getElementById\('model-btn'\)\.setAttribute\('aria-expanded', String\(willOpen\)\);/);
  assert.match(appHtml, /function closeModelMenu\(\) \{\s+document\.getElementById\('model-menu'\)\.classList\.add\('hidden'\);\s+document\.getElementById\('model-btn'\)\.setAttribute\('aria-expanded', 'false'\);/);
  assert.match(appHtml, /document\.addEventListener\('click', closeModelMenu\);/);
});

test('Task 116 closes only the open model menu with an unhandled Escape key and restores trigger focus', () => {
  assert.match(appHtml, /document\.addEventListener\('keydown', \(event\) => \{\s+if \(event\.key !== 'Escape' \|\| event\.defaultPrevented\) return;\s+const menu = document\.getElementById\('model-menu'\);\s+if \(!menu \|\| menu\.classList\.contains\('hidden'\)\) return;\s+event\.preventDefault\(\);\s+closeModelMenu\(\);\s+document\.getElementById\('model-btn'\)\?\.focus\(\{ preventScroll: true \}\);\s+\}\);/);
});

test('Task 117 keeps Tab navigation inside the open model menu', () => {
  assert.match(appHtml, /function getVisibleModelMenuControls\(menu\) \{\s+return Array\.from\(menu\.querySelectorAll\('button, \[href\], input, select, textarea, \[tabindex\]:not\(\[tabindex="-1"\]\)'\)\)\s+\.filter\(\(element\) => !element\.closest\('\.hidden'\) && element\.offsetParent !== null && !element\.disabled\);/);
  assert.match(appHtml, /function trapModelMenuFocus\(event\) \{\s+if \(event\.key !== 'Tab'\) return;[\s\S]*?const focusable = getVisibleModelMenuControls\(menu\);[\s\S]*?if \(event\.shiftKey && document\.activeElement === first\) \{\s+event\.preventDefault\(\);\s+last\.focus\(\);[\s\S]*?else if \(!event\.shiftKey && document\.activeElement === last\) \{\s+event\.preventDefault\(\);\s+first\.focus\(\);/);
  assert.match(appHtml, /document\.addEventListener\('keydown', trapModelMenuFocus\);/);
});

test('Task 118 moves keyboard-triggered model-menu opening focus to the first visible choice', () => {
  assert.match(appHtml, /document\.getElementById\('model-btn'\)\.setAttribute\('aria-expanded', String\(willOpen\)\);\s+if \(willOpen && e\.detail === 0\) setTimeout\(focusModelMenuFirstChoice, 0\);/);
  assert.match(appHtml, /function focusModelMenuFirstChoice\(\) \{\s+const menu = document\.getElementById\('model-menu'\);\s+if \(!menu \|\| menu\.classList\.contains\('hidden'\)\) return;\s+getVisibleModelMenuControls\(menu\)\[0\]\?\.focus\(\{ preventScroll: true \}\);\s+\}/);
});

test('Task 119 moves Arrow-key focus within the open model menu and wraps visible choices', () => {
  assert.match(appHtml, /function navigateModelMenuWithArrows\(event\) \{\s+if \(!\['ArrowDown', 'ArrowUp', 'Home', 'End'\]\.includes\(event\.key\)\) return;[\s\S]*?const focusable = getVisibleModelMenuControls\(menu\);[\s\S]*?const currentIndex = focusable\.indexOf\(document\.activeElement\);[\s\S]*?const direction = event\.key === 'ArrowDown' \? 1 : -1;[\s\S]*?\(currentIndex \+ direction \+ focusable\.length\) % focusable\.length;\s+\}\)\(\);\s+event\.preventDefault\(\);\s+focusable\[nextIndex\]\.focus\(\);\s+\}/);
  assert.match(appHtml, /document\.addEventListener\('keydown', navigateModelMenuWithArrows\);/);
});

test('Task 120 exposes the selected model with synchronized radio-menu semantics', () => {
  assert.match(appHtml, /pickModel\('fabie'\)" data-model-choice="fabie" role="menuitemradio" aria-checked="false"/);
  assert.match(appHtml, /pickModel\('smart'\)" data-model-choice="smart" role="menuitemradio" aria-checked="true"/);
  assert.match(appHtml, /pickModel\('ultra'\)" data-model-choice="ultra" role="menuitemradio" aria-checked="false"/);
  assert.match(appHtml, /pickModel\('researcher'\)" data-model-choice="researcher" role="menuitemradio" aria-checked="false"/);
  assert.match(appHtml, /document\.querySelectorAll\('\[data-model-choice\]'\)\.forEach\(\(choice\) => \{\s+choice\.setAttribute\('aria-checked', String\(choice\.dataset\.modelChoice === cur\)\);\s+\}\);/);
  assert.match(appHtml, /closeModelMenu\(\); openPlans\(\)" role="menuitem"/);
});

test('Task 121 keeps the mobile model menu scrollable within a bounded viewport', () => {
  assert.match(appHtml, /@media \(max-width: 767px\) \{[\s\S]*?#model-menu \{[^}]*?max-height: 58dvh !important; overflow-y: auto !important; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;/);
});

test('Task 122 refreshes existing selected-model indicators immediately after a permitted choice', () => {
  assert.match(appHtml, /function pickModel\(m\) \{/);
  assert.match(appHtml, /\['researcher', 'security', 'tester'\]\.includes\(m\) && !\(s\.plan === 'plus' \|\| s\.plan === 'lite' \|\| s\.plan === 'pro' \|\| isOwner\(\)\)/);
  assert.match(appHtml, /Store\.set\(\{ model: m \}\);\s+refreshModelMenu\(\);/);
});

test('Task 145 lets keyboard users jump to the first or last visible model-menu option', () => {
  assert.match(appHtml, /if \(!\['ArrowDown', 'ArrowUp', 'Home', 'End'\]\.includes\(event\.key\)\) return;/);
  assert.match(appHtml, /const nextIndex = event\.key === 'Home'\s+\? 0\s+: event\.key === 'End'\s+\? focusable\.length - 1/);
  assert.match(appHtml, /focusable\[nextIndex\]\.focus\(\);/);
});

test('Task 146 gives specialist model choices concise explicit accessible names', () => {
  assert.match(appHtml, /data-model-choice="researcher"[^>]*aria-label="Select Research AI for documented sources and uncertainty"/);
  assert.match(appHtml, /data-model-choice="security"[^>]*aria-label="Select Security AI for risk assessment and fixes"/);
  assert.match(appHtml, /data-model-choice="tester"[^>]*aria-label="Select Test AI for edge cases and evidence limits"/);
});

test('Task 148 synchronizes the workspace recording control state with recording mode', () => {
  assert.match(appHtml, /<button class="rec-btn" id="rec-btn" onclick="toggleRecording\(\)" aria-pressed="false" aria-label="Start recording mode" title="Start recording mode">● REC<\/button>/);
  assert.match(appHtml, /btn\.setAttribute\('aria-pressed', String\(on\)\);/);
  assert.match(appHtml, /btn\.setAttribute\('aria-label', on \? 'Stop recording mode' : 'Start recording mode'\);/);
  assert.match(appHtml, /btn\.title = on \? 'Stop recording mode' : 'Start recording mode';/);
});

test('Task 149 returns focus to the model chooser after choosing a model', () => {
  assert.match(appHtml, /function pickModel\(m\) \{\s+const s = Store\.get\(\);\s+closeModelMenu\(\);\s+const modelButton = document\.getElementById\('model-btn'\);\s+modelButton\?\.focus\(\{ preventScroll: true \}\);/);
  assert.match(appHtml, /Store\.set\(\{ model: m \}\);\s+refreshModelMenu\(\);[\s\S]*?modelButton\.innerHTML = labels\[m\] \|\| labels\.smart;/);
});

test('Task 150 removes theme controls while preserving text-size settings', () => {
  assert.doesNotMatch(appHtml, /id="seg-dark"|id="seg-light"|top-theme-toggle|top-theme-label/);
  assert.match(appHtml, /id="seg-txt-sm" class="seg" onclick="setTextSize\('sm'\)" aria-pressed="false"/);
  assert.match(appHtml, /id="seg-txt-md" class="seg" onclick="setTextSize\('md'\)" aria-pressed="true"/);
  assert.match(appHtml, /id="seg-txt-lg" class="seg" onclick="setTextSize\('lg'\)" aria-pressed="false"/);
  assert.match(appHtml, /b\.setAttribute\('aria-pressed', String\(active\)\);/);
});

test('Task 151 keeps the workspace dark-only without automatic light scheduling', () => {
  assert.doesNotMatch(appHtml, /id="side-theme-toggle"|title="Theme changes automatically by hour"|function toggleDarkMode\(/);
  assert.doesNotMatch(appHtml, /function startAutomaticTheme\(/);
  assert.match(appHtml, /chats = s\.chats;\s+setMode\('dark', 'dark-only'\);/);
  assert.doesNotMatch(appHtml, /LIGHT_THEME_START_HOUR|DARK_THEME_START_HOUR|automaticMode\(/);
  assert.doesNotMatch(appHtml, /Manual override active; automatic schedule resumes at the next hour\./);
});

test('Task 152 exposes both existing Terms destinations as native links', () => {
  assert.match(appHtml, /<a href="\/terms\.html" class="side-act"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-doc"\/><\/svg><\/span>Terms<\/a>/);
  assert.match(appHtml, /<a href="\/terms\.html" class="set-item set-click">\s+<div class="set-key"><i class="sk-ico t-slate"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-doc"\/><\/svg><\/i>Terms &amp; Privacy<\/div>\s+<div class="set-chev" aria-hidden="true">›<\/div>\s+<\/a>/);
  assert.doesNotMatch(appHtml, /<button onclick="location\.href='\/terms\.html'" class="side-act">/);
});

test('premium workspace redesign keeps chat presentation clean, centered, and behavior-preserving', () => {
  assert.match(appHtml, /\/\* ═══════════ CLEAN PREMIUM CONVERSATION WORKSPACE ═══════════ \*\//);
  assert.match(appHtml, /body::before \{ background: #0d0720 !important; background-image: none !important; \}/);
  assert.match(appHtml, /#chat \{ width: min\(100%, 760px\) !important; max-width: 760px !important;/);
  assert.match(appHtml, /#sidebar \{ width: 232px !important;[\s\S]*?background: #100a22 !important;/);
  assert.match(appHtml, /\.message\.msg-user \.msg-content \{[\s\S]*?background: #7050bb !important;/);
  assert.match(appHtml, /\.message\.msg-ai \{ display: grid !important; grid-template-columns: 28px minmax\(0, 1fr\);/);
  assert.match(appHtml, /#chat \.message\.msg-user, #chat \.message\.msg-ai \{ padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: transparent !important; box-shadow: none !important; \}/);
  assert.match(appHtml, /\.assistant-avatar \{ display: grid; width: 28px; height: 28px;/);
  assert.match(appHtml, /\.input-area > \.flex \{ width: min\(100%, 760px\) !important;[\s\S]*?border-radius: 20px !important; background: #17102b !important;/);
  assert.match(appHtml, /const isUserMessage = msg\.role === 'user';\s+return isUserMessage\s+\? `<article class="message msg-user"><div class="msg-content">\$\{content\}<\/div><\/article>`\s+: `<article class="message msg-ai"><div class="assistant-avatar" aria-hidden="true">✦<\/div><div class="msg-content">\$\{content\}<\/div><\/article>`;/);
});

test('premium workspace redesign keeps the mobile composer controls compact without removing core actions', () => {
  assert.match(appHtml, /#send-btn:not\(\.is-stop\) \{ color: transparent !important; font-size: 0 !important; \}/);
  assert.match(appHtml, /#send-btn:not\(\.is-stop\)::after \{ content: '↑'; color: #160c2c !important;/);
  assert.match(appHtml, /#credits-btn, #keyboard-hint, \[href\*="smollaunch"\] \{ display: none !important; \}/);
  assert.match(appHtml, /#image-upload-btn, #ws-btn, \.model-pill \{ min-height: 34px !important;/);
  assert.match(appHtml, /#rec-btn \{ right: 14px !important; bottom: 106px !important;/);
  assert.match(appHtml, /\[href\*="smollaunch"\] \{ display: none !important; \}/);
  assert.match(appHtml, /@media \(min-width: 768px\) and \(max-width: 1100px\) \{\s+#credits-btn, #keyboard-hint \{ display: none !important; \}/);
});
