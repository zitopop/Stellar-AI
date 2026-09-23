import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('email authentication uses the real signed-session API', () => {
  assert.match(app, /id="auth-password"/);
  assert.match(app, /const SESSION_STORE_KEY='stellar-store'/);
  assert.match(app, /headers\.Authorization='Bearer '\+token/);
  assert.match(app, /async function emailAuth\(mode\)[\s\S]*?fetch\('\/api\/auth'/);
  assert.match(app, /setSessionToken\(data\.session,signedInUser\)/);
  assert.doesNotMatch(app, /\/api\/auth\?action=session/);
});

test('Google sign-in exchanges verified credential for Stellar session', () => {
  assert.match(app, /accounts\.google\.com\/gsi\/client/);
  assert.match(app, /google\.accounts\.id\.initialize/);
  assert.match(app, /action:'googleLogin'/);
});

test('session-protected APIs receive bearer token', () => {
  assert.match(app, /fetch\('\/api\/get-plan'.*headers:authHeaders\(false\)/);
  assert.match(app, /fetch\('\/api\/chat'.*headers:authHeaders\(\)/);
  assert.match(app, /fetch\('\/api\/get-chats'.*headers:authHeaders\(\)/);
  assert.doesNotMatch(app, /x-stellar-email/);
});

test('local chat cache is isolated by verified account and hidden after session loss', () => {
  assert.match(app, /return email\?'stellarChats:'\+email:'stellarChats:guest'/);
  assert.doesNotMatch(app, /signedInUser=sessionState\(\)\.user/);
  assert.match(app, /Your account chat history is hidden until your session is verified again\./);
  assert.match(app, /Your signed-in chat history is hidden on this device until you sign back in\./);
});

test('AI request does not include the temporary Thinking assistant placeholder', () => {
  const history = app.indexOf('const requestMessages=chatText()');
  const thinking = app.indexOf("const assistantBubble=addMessage('assistant','Thinking…')");
  assert.ok(history >= 0 && thinking > history);
  assert.match(app, /messages:requestMessages/);
});

test('chat request carries image and explicit wallet-overage preference', () => {
  assert.match(app, /image:requestImage/);
  assert.match(app, /use_credit:creditsOn\(\)/);
});

test('chat state keeps pins and deletion cannot restore deleted chat', () => {
  assert.match(app, /pinned:Boolean\(existing\?\.pinned\)/);
  assert.match(app, /function newChat\(skipSave=false\)/);
  assert.match(app, /function deleteChat\(\)[\s\S]*?newChat\(true\)/);
});
