import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('sign-in opens above the responsive drawer and locks the modal state', () => {
  assert.match(app, /function\s+openWelcome\(\)\s*\{[\s\S]*?closeResponsiveSidebar\(\);[\s\S]*?document\.body\.classList\.add\('auth-open'\);[\s\S]*?welcome-modal/);
  assert.match(app, /#welcome-modal\{[\s\S]*?z-index:4000!important/);
  assert.match(app, /#welcome-modal \.welcome-card\{[\s\S]*?z-index:4001!important/);
});

test('sign-in dismissal and sign-out clear the auth overlay state', () => {
  assert.match(app, /function\s+dismissWelcome\(\)\s*\{[\s\S]*?classList\.remove\('auth-open'\)/);
  assert.match(app, /function\s+signOut\(\)\s*\{[\s\S]*?closeResponsiveSidebar\(\);[\s\S]*?document\.body\.classList\.remove\('auth-open'\)/);
  assert.match(app, /function\s+signOut\(\)\s*\{[\s\S]*?clearSessionToken\(\)/);
});

test('account controls remain explicit touch-safe buttons', () => {
  assert.match(app, /<button type="button" onclick="emailAuth\('login'\)"[^>]*>Sign in<\/button>/);
  assert.match(app, /<button type="button" onclick="emailAuth\('signup'\)"[^>]*>Create account<\/button>/);
  assert.match(app, /id="auth-password"/);
  assert.match(app, /id="account-button"[^>]*onclick="accountAction\(\)"/);
  assert.match(app, /id="settings-signout-row"[^>]*signed-in-only/);
});

test('Settings keeps an authenticated session active', () => {
  assert.match(app, /function\s+settingsAuthAction\(\)\s*\{[\s\S]*?if\s*\(signedInUser&&signedInUser\.email\)[\s\S]*?You are signed in\.[\s\S]*?return[\s\S]*?closeSettings\(\);openWelcome\(\)/);
  assert.doesNotMatch(app, /function\s+settingsAuthAction\(\)\s*\{[\s\S]*?signOut\(\)/);
  assert.match(app, /authKey\.textContent=signedIn\?'Signed in':'Sign in'/);
  assert.match(app, /authRow\.classList\.toggle\('set-click',!signedIn\)/);
});

test('owner tools only appear for recognised owner UI state', () => {
  assert.match(app, /owner-only/);
  assert.match(app, /function isOwner\(\)\{return serverOwner===true\}/);
});

test('Settings hides external sign-in controls once authenticated', () => {
  assert.match(app, /const discordRow=document\.getElementById\('discord-signin-btn'\)/);
  assert.match(app, /discordRow\.style\.display=signedIn\?'none':''/);
  assert.match(app, /const googleRow=document\.getElementById\('g-signin-main'\)/);
  assert.match(app, /googleRow\.style\.display=signedIn\?'none':''/);
});
