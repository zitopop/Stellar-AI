import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(root, '..', 'api');
const handlers = fs.readdirSync(apiDir).filter(name => name.endsWith('.js')).sort();

 test('Vercel Hobby deployment stays within the 12-function limit', () => {
  assert.equal(handlers.length, 12, `Expected 12 API handlers, found ${handlers.length}: ${handlers.join(', ')}`);
});

 test('all expected public endpoint handlers remain present', () => {
  assert.deepEqual(handlers, [
    'auth.js', 'broadcast.js', 'chat.js', 'create-checkout.js', 'discord-oauth.js',
    'get-chats.js', 'get-plan.js', 'grant.js', 'save-chats.js', 'search.js',
    'send-welcome.js', 'webhook.js',
  ]);
});
