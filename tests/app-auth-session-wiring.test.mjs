import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('email authentication uses the real signed-session API', () => {
  assert.match(app, /id="authPassword"/);
  assert.match(app, /const STORE='stellar-store'/);
  assert.match(app, /h\.Authorization='Bearer '\+t/);
  assert.match(app, /async function emailAuth\(mode\)[\s\S]*?fetch\('\/api\/auth'/);
  assert.match(app, /setSession\(data\.session,signedInUser\)/);
  assert.doesNotMatch(app, /\/api\/auth\?action=session/);
});

test('Google sign-in exchanges verified credential for Stellar session', () => {
  assert.match(app, /accounts\.google\.com\/gsi\/client/);
  assert.match(app, /google\.accounts\.id\.initialize/);
  assert.match(app, /action:'googleLogin'/);
  assert.match(app, /setSession\(data\.session,signedInUser\)/);
});

test('session-protected APIs receive bearer token', () => {
  assert.match(app, /fetch\('\/api\/get-plan',[\s\S]*?headers:authHeaders\(false\)/);
  assert.match(app, /fetch\('\/api\/chat',[\s\S]*?headers:authHeaders\(\)/);
  assert.doesNotMatch(app, /x-stellar-email/);
});

test('local chat cache is isolated by account identity and falls back to guest after sign-out', () => {
  assert.match(app, /function accountKey\(\)\{return String\(signedInUser&&signedInUser\.email\|\|'guest'\)/);
  assert.match(app, /function sessionsKey\(\)\{return 'stellar-chat-sessions:'\+accountKey\(\)\}/);
  assert.match(app, /function clearSession\(\)/);
  assert.match(app, /signedInUser=null/);
});

test('temporary Thinking UI is never persisted into request history', () => {
  assert.match(app, /const reply=addMessage\('assistant','Thinking…'\)/);
  assert.match(app, /messages:s\.messages\.slice\(-16\)/);
  assert.doesNotMatch(app, /s\.messages\.push\(\{role:'assistant',content:'Thinking…'/);
});

test('signed-in chat requests can use wallet credits and refresh plan truth', () => {
  assert.match(app, /use_credit:Boolean\(token\(\)\)/);
  assert.match(app, /if\(token\(\)\)loadPlanTruth\(\)/);
});
