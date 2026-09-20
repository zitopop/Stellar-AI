import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('sign-in opens above the responsive drawer and locks the modal state', () => {
  assert.match(app, /function openWelcome\(\) \{[\s\S]*?closeResponsiveSidebar\(\);[\s\S]*?document\.body\.classList\.add\('auth-open'\);[\s\S]*?welcome-modal/);
  assert.match(app, /#welcome-modal\{[\s\S]*?z-index:4000!important/);
  assert.match(app, /#welcome-modal \.welcome-card\{[\s\S]*?z-index:4001!important/);
});

test('sign-in dismissal and sign-out clear the auth overlay state', () => {
  assert.match(app, /function dismissWelcome\(\) \{[\s\S]*?classList\.remove\('auth-open'\)/);
  assert.match(app, /function signOut\(\) \{\s+closeResponsiveSidebar\(\);\s+document\.body\.classList\.remove\('auth-open'\)/);
});

test('account controls remain explicit touch-safe buttons', () => {
  assert.match(app, /<button type="button" onclick="emailAuth\('login'\)"[^>]*>Sign in<\/button>/);
  assert.match(app, /<button type="button" onclick="emailAuth\('signup'\)"[^>]*>Create account<\/button>/);
  assert.match(app, /#account-box \.acct-out-btn\{[\s\S]*?min-width:86px!important;[\s\S]*?text-indent:0!important/);
  assert.match(app, /#account-box \.acct-out-btn::after\{[\s\S]*?content:none!important/);
});
