import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app home greeting stays simple and chat-first', () => {
  assert.match(app, /function welcomeHtml\(\)\{return '<div class="welcome"><h1>Hi '/);
  assert.match(app, /What can I help with\? Type below\. Press ↑ to send\./);
  assert.match(app, /function displayName\(user\)/);
  assert.doesNotMatch(app, /class="home-actions"/);
  assert.doesNotMatch(app, /<div class="quick">/);
});
