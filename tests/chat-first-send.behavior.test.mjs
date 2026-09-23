import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

test('first send path still points at the chat API and renders assistant status', () => {
  assert.match(app, /\/api\/chat/);
  assert.match(app, /sendMessage/);
  assert.match(app, /Thinking|thinking/i);
  assert.match(app, /retry/i);
});

test('server chat handler still validates message presence and records completed streams', () => {
  assert.match(chat, /hasLatestUserMessage/);
  assert.match(chat, /streamCompleted/);
  assert.match(chat, /consumeServerUsage/);
});
