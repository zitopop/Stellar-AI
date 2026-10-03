import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

test('first send path points at chat API and renders recoverable assistant status', () => {
  assert.match(app, /fetch\('\/api\/chat'/);
  assert.match(app, /async function sendMessage\(/);
  assert.match(app, /Thinking…/);
  assert.match(app, /Try again\./);
  assert.match(app, /chat-send-error/);
});

test('server chat handler validates message presence and records completed streams', () => {
  assert.match(chat, /hasLatestUserMessage/);
  assert.match(chat, /streamCompleted/);
  assert.match(chat, /consumeServerUsage/);
});
