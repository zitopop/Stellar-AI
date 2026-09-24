import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const handlers = fs.readdirSync(new URL('../api/', import.meta.url)).filter((name) => name.endsWith('.js')).sort();

test('public API handlers stay explicit and include the analytics route', () => {
  assert.deepEqual(handlers, [
    'auth.js', 'broadcast.js', 'chat.js', 'create-checkout.js', 'desktop-agent.js',
    'discord-oauth.js', 'get-chats.js', 'get-plan.js', 'grant.js', 'search.js',
    'stellar-call.js', 'track-event.js', 'webhook.js',
  ]);
  assert.ok(handlers.length <= 13, 'Keep Vercel function count under control.');
});
