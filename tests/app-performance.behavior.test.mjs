import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('streaming replies follow only while the reader stays near the bottom', () => {
  assert.match(app, /function chatNearBottom\(threshold=120\)/);
  assert.match(app, /const follow=chatNearBottom\(\)/);
  assert.match(app, /if\(follow\)followChatToBottom\(\)/);
  assert.doesNotMatch(app, /reply\.closest\('\.msg\.assistant'\)\?\.scrollIntoView\(\{block:'end'\}\)/);
});

test('Google Identity is lazy-loaded only when sign in is opened', () => {
  assert.doesNotMatch(app, /<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer><\/script>/);
  assert.match(app, /function ensureGoogleIdentityScript\(\)/);
  assert.match(app, /script\.src='https:\/\/accounts\.google\.com\/gsi\/client'/);
  assert.match(app, /function renderGoogleButton\(\)\{void ensureGoogleIdentityScript\(\)/);
});
