import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('chat history stays compact behind a single options menu', () => {
  assert.match(app, /className='chat-menu-button'/);
  assert.match(app, /dataset\.chatMenu/);
  assert.match(app, /chat-history-row\.menu-open \.chat-actions/);
  assert.match(app, /closeChatMenus/);
  assert.match(app, /Unpin before deleting/);
});

test('assistant pending state uses an accessible animated thinking cue', () => {
  assert.match(app, /class="typing-indicator"/);
  assert.match(app, /aria-label="Stellar is thinking"/);
  assert.match(app, /@keyframes stellarThinking/);
  assert.match(app, /prefers-reduced-motion:reduce/);
});

test('empty workspace stays chat-first while explaining the core actions', () => {
  assert.match(app, /What can I help with\?/);
  assert.match(app, /Ask anything, attach a file or image, search the web when needed, or switch to Debug for broken code/);
  assert.doesNotMatch(app, /quick-start-card|suggested-prompt-grid/);
});

test('sidebar keeps plan navigation neutral instead of constantly upselling', () => {
  assert.match(app, /id="side-plan-button"/);
  assert.match(app, /sidePlanButton\.textContent='Plans'/);
  assert.doesNotMatch(app, /sidePlanButton\.textContent=.*Upgrade plan/);
});

test('new chat polish preserves paid-customer billing portal routing', () => {
  assert.match(app, /res\.status===409&&data\.code==='ACTIVE_SUBSCRIPTION_EXISTS'&&data\.manageBilling===true/);
  assert.match(app, /Opening billing so you can change plan/);
});
