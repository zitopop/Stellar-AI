import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chatCss = fs.readFileSync(new URL('../stellar-chatgpt-layout.css', import.meta.url), 'utf8');

test('homepage and app use their current stylesheet layers', () => {
  assert.match(index, /href="\/lib\/assets\/homepage\.css\?v=/);
  assert.match(app, /href="\/stellar-chatgpt-layout\.css\?v=4"/);
  assert.match(app, /href="\/stellar-app-landing-ui\.css\?v=1"/);
  assert.match(app, /href="\/lib\/assets\/stellar-cosmic-openai\.css\?v=20260923-openai-space"/);
});

test('chat layout keeps mobile-safe controls', () => {
  assert.match(chatCss, /44px/);
  assert.match(chatCss, /max-width:640px|max-width:700px|max-width:760px/);
  assert.match(app, /touch-action:manipulation/);
});
