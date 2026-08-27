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

test('Task 172 keeps the workspace dark-only with no theme toggle or automatic light scheduling', () => {
  assert.match(workspaceHtml, /<span class="ws-toggle top-theme-toggle" aria-label="Dark mode only"/);
  assert.match(workspaceHtml, /function startAutomaticTheme\(\)\s*\{\s*setMode\('dark', 'dark-only'\);\s*\}/);
  assert.match(workspaceHtml, /document\.body\.classList\.remove\('light'\)/);
  assert.doesNotMatch(workspaceHtml, /id="side-theme-toggle"/);
  assert.doesNotMatch(workspaceHtml, /LIGHT_THEME_START_HOUR/);
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

test('Task 177 keeps the model-menu trigger an explicit non-submit button', () => {
  assert.match(workspaceHtml, /<button type="button" id="model-btn" onclick="toggleModelMenu\(event\)" class="model-pill" aria-label="Choose model: Star, recommended for most scripts" aria-haspopup="menu" aria-controls="model-menu" aria-expanded="false">/);
  assert.doesNotMatch(workspaceHtml, /<button id="model-btn" onclick="toggleModelMenu\(event\)"/);
});

test('Task 178 keeps every Settings tab an explicit non-submit button', () => {
  for (const tab of ['account', 'plan', 'usage', 'look', 'about']) {
    assert.match(workspaceHtml, new RegExp(`<button type="button" class="set-tab(?: active)?" data-tab="${tab}" onclick="setTab\\('${tab}'\\)">`));
  }
  assert.match(workspaceHtml, /document\.querySelectorAll\('\.set-tab'\)\.forEach\(t => t\.classList\.toggle\('active', t\.dataset\.tab === name\)\)/);
});

test('Task 179 keeps Settings dark-only and removes the Light appearance control', () => {
  assert.match(workspaceHtml, /<span id="seg-dark" class="seg on" aria-label="Dark mode only" aria-pressed="true">🌙 Dark only<\/span>/);
  assert.match(workspaceHtml, /const darkToggle = document\.getElementById\('seg-dark'\);[\s\S]*?darkToggle\.setAttribute\('aria-pressed', 'true'\)/);
  assert.doesNotMatch(workspaceHtml, /id="seg-light"/);
  assert.doesNotMatch(workspaceHtml, /setMode\('light'\)/);
});

test('Task 180 keeps Small, Normal, and Large text-size controls explicit non-submit buttons', () => {
  for (const [id, size, pressed, label] of [
    ['seg-txt-sm', 'sm', 'false', 'Small'],
    ['seg-txt-md', 'md', 'true', 'Normal'],
    ['seg-txt-lg', 'lg', 'false', 'Large'],
  ]) {
    assert.match(workspaceHtml, new RegExp(`<button type="button" id="${id}" class="seg" onclick="setTextSize\\('${size}'\\)" aria-pressed="${pressed}">${label}<\\/button>`));
    assert.doesNotMatch(workspaceHtml, new RegExp(`<button id="${id}" class="seg"`));
  }
  assert.match(workspaceHtml, /const active = k === t; b\.classList\.toggle\('on', active\); b\.setAttribute\('aria-pressed', String\(active\)\)/);
});

test('Task 181 keeps workspace suggestion chips explicit non-submit buttons', () => {
  const suggestionButtons = workspaceHtml.match(/<button type="button" onclick="useSuggestion\(/g) ?? [];
  assert.equal(suggestionButtons.length, 14);
  assert.doesNotMatch(workspaceHtml, /<button onclick="useSuggestion\(/);
  assert.match(workspaceHtml, /useSuggestion\('QBCore police job with F6 menu, handcuffing, MDT and jail timer'\)/);
  assert.match(workspaceHtml, /useSuggestion\('Roblox Build Pack: create a secure tapping simulator with rebirths, pets, leaderboards, server-authoritative currency, RemoteEvents, DataStore persistence, exact Studio file placement and a test checklist'\)/);
  assert.match(workspaceHtml, /useSuggestion\('Fix this broken script: '\)/);
});

test('Task 185 keeps top-up credit controls explicit non-submit buttons', () => {
  for (const amount of ['300', '1000', '2500', '5000']) {
    assert.match(workspaceHtml, new RegExp(`<button type="button" onclick="pickTopup\\(${amount}\\)" data-amt="${amount}" class="pack`));
  }
  assert.match(workspaceHtml, /<button type="button" id="topup-buy" onclick="buyTopup\(document\.getElementById\('topup-range'\)\.value\)"/);
  assert.match(workspaceHtml, /<button type="button" onclick="closeTopup\(\)" class="plan-btn glass w-full mt-2 topup-cancel">Cancel<\/button>/);
});

test('chat workspace refinement keeps the model picker descriptive, flat, and behavior-preserving', () => {
  assert.match(workspaceHtml, /\/\* Workspace refinement: clearer chat rhythm and model hierarchy, with no routing or interaction changes\. \*\//);
  assert.match(workspaceHtml, /#model-menu \{ width: min\(348px, calc\(100vw - 24px\)\) !important;[\s\S]*?background: #181818 !important;/);
  assert.match(workspaceHtml, /<div class="model-menu-heading" aria-hidden="true"><span>AI models<\/span><span>Select a focus<\/span><\/div>/);
  assert.match(workspaceHtml, /#model-menu \[data-model-choice\]\[aria-checked="true"\] \{ border-color: #d4d4d8; color: #101010 !important; background: #f4f4f5 !important; \}/);
  assert.match(workspaceHtml, /\.message\.msg-user \.msg-content \{ padding: 12px 15px !important;[\s\S]*?background: #27272a !important;/);
  assert.match(workspaceHtml, /\*, \*::before, \*::after \{ animation: none !important; transition: none !important; box-shadow: none !important;/);
});

test('workspace keeps the starter UI calm without removing its underlying guidance contract', () => {
  assert.match(workspaceHtml, /\.greet-wrap \.welcome-next-step, #settings-modal \.so-sub \{ display: none !important; \}/);
  assert.match(workspaceHtml, /class="welcome-next-step" role="note"/);
  assert.match(workspaceHtml, /class="welcome-guide-link">Guides/);
  assert.match(workspaceHtml, /class="so-sub">Sign in to keep your plan and credit safe/);
});

test('workspace welcome states keep first-use guidance and Guides discovery consistent', () => {
  const orientation = /<div class="welcome-next-step" role="note"><span class="welcome-next-step-label">Next<\/span><p><strong>Choose a starter,<\/strong> then review the files\.<\/p><a href="\/blog" class="welcome-guide-link">Guides <span aria-hidden="true">→<\/span><\/a><\/div>/g;
  assert.equal(workspaceHtml.match(orientation)?.length, 2);
  assert.equal((workspaceHtml.match(/id="welcome-starters-heading" class="welcome-starters-label">Choose a starting point<\/div>/g) ?? []).length, 2);
  assert.equal((workspaceHtml.match(/id="suggestion-chips" role="group" aria-labelledby="welcome-starters-heading"/g) ?? []).length, 2);
  assert.match(workspaceHtml, /\.welcome-next-step \{ display: grid; grid-template-columns: auto minmax\(0, 1fr\) auto;/);
  assert.match(workspaceHtml, /@media \(max-width: 767px\) \{[\s\S]*?\.welcome-next-step \{ grid-template-columns: 1fr;/);
  assert.match(workspaceHtml, /\.greet-wrap \{ opacity: 1 !important; \}/);
});

test('workspace sidebar retains an accessible persistent Guides-hub route', () => {
  assert.match(workspaceHtml, /<a href="\/blog" class="side-act side-guides-link" aria-label="Open FiveM and Roblox Guides"><span class="ico"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-info"\/><\/svg><\/span>Guides<\/a>/);
  assert.match(workspaceHtml, /\.side-guides-link \{ flex-direction: row !important; justify-content: center; gap: 7px !important; min-height: 38px !important;/);
  assert.match(workspaceHtml, /body\.light \.side-guides-link \{ color: #4b4658 !important; \}/);
});


test('Settings remains simplified after removing the Skill Tree surface', () => {
  assert.doesNotMatch(workspaceHtml, /set-skill-tree-section|set-skill-tree|renderSkillTree|skill-tree/);
  assert.doesNotMatch(workspaceHtml, /set-achievements-section|set-motivation|achievement-badge/);
  assert.match(workspaceHtml, /id="set-referral-section"/);
  assert.match(workspaceHtml, /id="set-plan-desc"/);
  assert.match(workspaceHtml, /id="set-usage-pct"/);
});
