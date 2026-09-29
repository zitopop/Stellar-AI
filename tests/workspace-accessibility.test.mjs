import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace navigation and composer expose stable accessible names', () => {
  assert.match(app, /aria-label="Stellar navigation"/);
  assert.match(app, /<label class="hidden" for="prompt">Message Stellar<\/label>/);
  assert.match(app, /id="status" role="status" aria-live="polite"/);
  assert.match(app, /id="sendBtn" type="submit" aria-label="Send"/);
});

test('interactive controls keep explicit button types and touch targets', () => {
  assert.match(app, /id="newChatBtn"[^>]*type="button"/);
  assert.match(app, /id="accountButton"[^>]*type="button"/);
  assert.match(app, /id="closePanel"[^>]*type="button"[^>]*aria-label="Close"/);
  assert.match(app, /\.btn,.nav\{min-height:44px/);
});

test('account and settings surfaces are mobile safe', () => {
  assert.match(app, /id="panel" role="dialog" aria-modal="true"/);
  assert.match(app, /@media\(max-width:540px\)[\s\S]*?max-height:91dvh/);
  assert.match(app, /safe-area-inset-bottom/);
});

test('model chooser remains inside the bounded settings panel', () => {
  assert.match(app, /function renderModelsPanel\(\)/);
  assert.match(app, /data-action="select-model"/);
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh;overflow:auto/);
});
