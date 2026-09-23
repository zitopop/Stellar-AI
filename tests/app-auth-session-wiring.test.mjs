import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('email authentication uses the real signed-session API', () => {
  assert.match(app, /id="auth-password"/);
  assert.match(app, /const SESSION_STORE_KEY='stellar-store'/);
  assert.match(app, /headers\.Authorization='Bearer '\+token/);
  assert.match(app, /async function emailAuth\(mode\)[\s\S]*?fetch\('\/api\/auth',\{method:'POST'/);
  assert.match(app, /setSessionToken\(data\.session,signedInUser\)/);
  assert.doesNotMatch(app, /\/api\/auth\?action=session/);
});

test('session-protected APIs receive the bearer token', () => {
  assert.match(app, /fetch\('\/api\/get-plan',\{cache:'no-store',headers:authHeaders\(false\)\}/);
  assert.match(app, /fetch\('\/api\/chat',\{method:'POST',headers:authHeaders\(\)/);
  assert.match(app, /fetch\('\/api\/get-chats',\{method:'POST',headers:authHeaders\(\)/);
  assert.doesNotMatch(app, /x-stellar-email/);
});

test('plan truth follows the server response shape and model capabilities', () => {
  assert.match(app, /const usage=data\.usage\|\|\{\}/);
  assert.match(app, /const capabilities=data\.capabilities\|\|\{\}/);
  assert.match(app, /Array\.isArray\(data\.availableModels\)/);
  assert.match(app, /usage\.limit\?\?capabilities\.requestsPerHour/);
});

test('chat state keeps pins and deletion cannot immediately restore the deleted chat', () => {
  assert.match(app, /pinned:Boolean\(existing\?\.pinned\)/);
  assert.match(app, /function newChat\(skipSave=false\)/);
  assert.match(app, /function deleteChat\(\)[\s\S]*?newChat\(true\)/);
});

test('first-signin onboarding tolerates blocked localStorage', () => {
  assert.match(app, /if\(Store\.get\(key,false\)\)return;Store\.set\(key,true\)/);
});
