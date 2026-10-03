import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('chatbox mirrors familiar ChatGPT-style control order',()=>{
  assert.match(app,/id="stellar-chatbox-v40"/);
  assert.match(app,/class="composer-main"/);
  assert.match(app,/id="image-upload-btn"[^>]*data-tooltip="Add image"/);
  assert.match(app,/placeholder="Ask anything"/);
  assert.match(app,/id="voice-input-btn"[^>]*data-tooltip="Voice"/);
  assert.match(app,/id="sendBtn"[^>]*data-tooltip="Send"/);
});

test('sidebar prioritises chats and keeps account controls at the bottom',()=>{
  assert.match(app,/class="side-account"/);
  assert.ok(app.indexOf('<p class="nav-title">Tools</p>')<app.indexOf('class="side-account"'));
  assert.match(app,/id="modelBtn"[^>]*title="Choose model"/);
});

test('public homepage chatbox uses the same simple ask-anything language',()=>{
  assert.match(home,/id="stellar-home-chatbox-v40"/);
  assert.match(home,/id="build-prompt"[^>]*placeholder="Ask anything"/);
  assert.match(home,/title="Start chat"/);
});
