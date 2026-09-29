import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace keeps the simple help question for empty chats', () => {
  assert.match(app, /What can I help with\?/);
});

test('signed-in greeting derives a bounded first name rather than rendering an email', () => {
  assert.match(app, /function displayName\(user\)/);
  assert.match(app, /raw\.split\(\/\\s\+\/\)\[0\]/);
  assert.match(app, /slice\(0,30\)/);
  assert.match(app, /escapeHtml\(displayName\(signedInUser\)\)/);
  assert.doesNotMatch(app, /<h1>Hi '\+escapeHtml\(signedInUser\.email/);
});
