import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeChats } from '../lib/get-chats-handler.js';

test('signed-in chat sync preserves assistant messages and pins', () => {
  const chats = sanitizeChats([
    {
      id: 'chat_1',
      title: 'Website fixes',
      pinned: true,
      messages: [
        { role: 'user', content: 'fix my app', t: 100 },
        { role: 'assistant', content: 'Fixed the layout.', t: 200 },
        { role: 'ai', content: 'Saved to GitHub.', t: 300 },
      ],
    },
  ]);

  assert.equal(chats.length, 1);
  assert.equal(chats[0].name, 'Website fixes');
  assert.equal(chats[0].pinned, true);
  assert.deepEqual(chats[0].messages.map((message) => message.role), ['user', 'assistant', 'assistant']);
});

test('signed-in chat sync strips unsafe ids and caps stored history', () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `message ${index}`, t: index + 1 }));
  const chats = sanitizeChats([{ id: 'chat<script>_2', name: 'Bad\u0000Name', messages }]);

  assert.equal(chats[0].id, 'chatscript_2');
  assert.equal(chats[0].name, 'BadName');
  assert.equal(chats[0].messages.length, 30);
  assert.equal(chats[0].messages[0].content, 'message 10');
});
