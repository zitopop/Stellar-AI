import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellar-auth-v52.css',import.meta.url),'utf8');

test('auth screen has distinct sign-in and account-creation states',()=>{
  assert.match(app,/let authMode='login'/);
  assert.match(app,/Create your Stellar account/);
  assert.match(app,/Welcome back/);
  assert.match(app,/data-action="auth-switch"/);
  assert.match(app,/Create free account/);
});

test('account creation communicates free/no-card terms without changing paid plan logic',()=>{
  assert.match(app,/Free account/);
  assert.match(app,/No card required/);
  assert.match(app,/Cancel upgrades anytime/);
});

test('email auth supports password visibility and Enter submission',()=>{
  assert.match(app,/data-action="auth-toggle-password"/);
  assert.match(app,/aria-label="Show password"/);
  assert.match(app,/void emailAuth\(authMode\)/);
  assert.match(css,/\.auth-password-toggle/);
});

test('auth UI keeps one Google render target and dedicated v52 stylesheet',()=>{
  assert.match(app,/id="googleRender"/);
  assert.match(app,/stellar-auth-v52\.css\?v=20261005-1/);
  assert.match(css,/\.stellar-auth-brand/);
  assert.match(css,/\.auth-free-strip/);
});
