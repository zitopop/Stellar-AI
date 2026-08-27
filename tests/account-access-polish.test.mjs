import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('account access uses welcoming, useful sign-in and signup copy', () => {
  assert.match(appHtml, /Pick up where you left off — your chats and plan stay synced\./);
  assert.match(appHtml, /Start free with £1 credit, then keep your chats and plan everywhere\./);
  assert.match(appHtml, /Continue without signing in/);
});

test('account access keeps all existing authentication actions', () => {
  assert.match(appHtml, /id="g-signin-main"/);
  assert.match(appHtml, /href="\/api\/discord-oauth"/);
  assert.match(appHtml, /onclick="emailAuth\('login'\)"/);
  assert.match(appHtml, /onclick="emailAuth\('signup'\)"/);
  assert.match(appHtml, /onclick="dismissWelcome\(\)"/);
});

test('account access has a premium dark mobile-safe visual layer', () => {
  assert.match(appHtml, /Account access polish: welcoming hierarchy, calm spacing, and premium dark controls/);
  assert.match(appHtml, /#welcome-modal \.welcome-card \{[\s\S]*?border-radius: 24px !important;/);
  assert.match(appHtml, /#welcome-modal \.own-input \{[\s\S]*?background: #0d0f13 !important;/);
  assert.match(appHtml, /@media \(max-width: 520px\) \{[\s\S]*?#welcome-modal \.welcome-card \{[\s\S]*?border-radius: 24px 24px 0 0 !important;/);
});
