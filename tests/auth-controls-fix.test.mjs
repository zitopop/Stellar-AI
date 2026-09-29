import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('sign-in uses the current modal panel above the responsive drawer', () => {
  assert.match(app, /function openPanel\(kind\)\{panelReturnFocus=document\.activeElement instanceof HTMLElement/);
  assert.match(app, /panelBackdrop\.classList\.add\('open'\)/);
  assert.match(app, /\.panel-backdrop\{position:fixed;inset:0;[\s\S]*?z-index:40/);
  assert.match(app, /id="panel" role="dialog" aria-modal="true"/);
});

test('sign-in dismissal and sign-out clear visible account state without killing valid sessions', () => {
  assert.match(app, /function closePanel\(\)\{panelBackdrop\.classList\.remove\('open'\)/);
  assert.match(app, /data-action="signout"/);
  assert.match(app, /clearSession\(\);signedInUser=null/);
  assert.doesNotMatch(app, /openPanel\('settings'\)[\s\S]{0,300}clearSession\(\)/);
});

test('account controls remain explicit touch-safe buttons', () => {
  assert.match(app, /data-action="email-login">Sign in<\/button>/);
  assert.match(app, /data-action="email-signup">Create account<\/button>/);
  assert.match(app, /id="authPassword"/);
  assert.match(app, /id="accountButton"[^>]*data-open="settings"/);
  assert.match(app, /\.btn,.nav\{min-height:44px/);
});

test('Settings keeps authenticated sessions active until explicit sign-out', () => {
  assert.match(app, /signedInUser\?'Account':'Sign in'/);
  assert.match(app, /signedInUser\?'Plan, credits and billing\.'/);
  assert.match(app, /escapeHtml\(displayName\(signedInUser\)\)/);
});

test('owner state comes only from server plan truth', () => {
  assert.match(app, /serverOwner=data\.owner===true\|\|account\.owner===true/);
  assert.match(app, /function totalCredits\(\)\{return serverOwner\?Infinity/);
});
