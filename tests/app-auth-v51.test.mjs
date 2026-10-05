import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellar-auth-v51.css',import.meta.url),'utf8');

test('signed-out settings uses a focused Stellar sign-in surface',()=>{
  assert.match(app,/Sign in to Stellar/);
  assert.match(app,/Save chats, keep your plan synced, and continue on any device/);
  assert.match(app,/auth-provider-discord/);
  assert.match(app,/or continue with email/);
  assert.match(app,/By continuing, you agree to the/);
});

test('Google sign-in renders one widget and hides fallback when the widget succeeds',()=>{
  assert.match(app,/target\.replaceChildren\(\)/);
  assert.match(app,/fallback\.hidden=true/);
  assert.match(app,/target\.querySelector\('iframe'\)/);
  assert.match(css,/\.google-fallback\[hidden\]/);
  assert.match(css,/#stellar-google-signin-box,\.stellar-google-box\{display:none!important\}/);
});

test('service worker no longer injects a second Google auth UI',()=>{
  assert.match(sw,/Google sign-in is owned by app\.html/);
  const body=sw.slice(sw.indexOf('async function patchAppNavigationResponse'),sw.indexOf('async function patchHomeNavigationResponse'));
  assert.doesNotMatch(body,/googleSignInPatch\(\)/);
});

test('auth surface has dedicated desktop and mobile presentation',()=>{
  assert.match(css,/#panel\.auth-panel/);
  assert.match(css,/\.panel-backdrop\.auth-open/);
  assert.match(css,/@media\(max-width:540px\)/);
  assert.match(css,/min-height:52px!important/);
});
