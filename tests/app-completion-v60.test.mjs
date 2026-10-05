import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('app.html');
const css = read('lib/assets/stellar-app-completion-v60.css');

test('v60 is the authoritative chat-first app finish', () => {
  assert.match(app, /stellar-release" content="2026-10-05-app-completion-v60"/);
  assert.match(app, /stellar-app-contract" content="chat-first-v60"/);
  assert.match(app, /stellar-app-completion-v60\.css\?v=20261005-v60/);
  assert.match(app, /--accent:#9b8cff/);
  assert.match(app, /--accent2:#f0edff/);
  assert.match(css, /--bg:#090a0f!important/);
  assert.match(css, /--accent:#9b8cff!important/);
});


test('inline app runtime parses as JavaScript', () => {
  const match = app.match(/<script id="stellar-google-signin-ui-v1">([\s\S]*?)<\/script>/);
  assert.ok(match, 'main inline app runtime missing');
  assert.doesNotThrow(() => new Function(match[1]));
});

test('workspace stays simple while keeping the useful tools', () => {
  for (const id of ['side','newChatBtn','search-chats-btn','chat','chatForm','prompt','sendBtn','modelBtn','image-upload-btn','web-search-btn','voice-input-btn']) {
    assert.ok(app.includes('id="' + id + '"'), 'missing #' + id);
  }
  assert.match(app, /What can I help with\?/);
  assert.match(app, /data-composer-mode="general"/);
  assert.match(app, /data-composer-mode="debug"/);
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.match(app, /aria-label="Model: Stellar Fast"/);
});

test('attachments are removable and failed sends remain retryable', () => {
  assert.match(app, /id="attachment-clear-btn"/);
  assert.match(app, /attachmentClear\?\.classList\.add\('hidden'\)/);
  assert.match(app, /attachmentClear\?\.classList\.remove\('hidden'\)/);
  assert.match(app, /Attachment removed/);
  assert.match(app, /metric\('chat-send-error'\);renderAssistantBubble[\s\S]*addAssistantActions/);
});

test('keyboard, speech and modal behavior support real users', () => {
  assert.match(app, /e\.isComposing\|\|e\.keyCode===229/);
  assert.match(app, /recognition\.lang=navigator\.language\|\|document\.documentElement\.lang\|\|'en-GB'/);
  assert.match(app, /function trapPanelFocus\(e\)/);
  assert.match(app, /panelBackdrop\.addEventListener\('click',e=>\{if\(e\.target===panelBackdrop\)closePanel\(\)\}\)/);
  assert.match(app, /if\(e\.key==='Escape'\)\{closeSide\(\);closePanel\(\)\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('sign in is clear without blocking guest use', () => {
  assert.match(app, /Sign in to Stellar/);
  assert.match(app, /Use Discord, Google or email\./);
  assert.match(app, /No sign-in is required to try the workspace/);
  assert.match(app, /Continue with Discord/);
  assert.match(app, /Primary one-click sign-in for FiveM and Roblox builders\./);
  assert.match(app, /data-action="email-login"/);
  assert.match(app, /data-action="email-signup"/);
  assert.match(app, /Save chats, keep your plan synced, and continue on any device/);
});

test('pricing remains discoverable and model labels match the real default', () => {
  assert.match(app, /#side-plan-button\{display:flex!important\}/);
  assert.match(app, /#side-plan-button\[hidden\]\{display:none!important\}/);
  assert.match(app, /sidePlanButton\.hidden=serverOwner/);
  assert.match(app, /badge:'Core'/);
  assert.doesNotMatch(app, /badge:'Default'/);
});

test('native store mode suppresses web checkout and adds app-like sharing', () => {
  assert.match(app, /const NATIVE_SHELL=/);
  assert.match(app, /Purchases are not offered in this mobile build/);
  assert.match(app, /data-message-action="share"/);
  assert.match(app, /Capacitor\?\.Plugins\?\.Share/);
  assert.match(app, /requires a '.+?' account/);
});

test('billing, plan gating and private owner tools stay server controlled', () => {
  assert.match(app, /function startPlanCheckout\(plan\)/);
  assert.match(app, /u\.hostname!=='checkout\.stripe\.com'/);
  assert.match(app, /fetch\('\/api\/get-plan'/);
  assert.match(app, /if\(!isOwner\(\)\)return''/);
  assert.match(app, /Stellar Deep is included with Plus at £20\/month/);
  assert.match(app, /Stellar Max requires Pro/);
});
