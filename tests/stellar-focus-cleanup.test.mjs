import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-focus-v1.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../lib/assets/stellar-focus-v1.js', import.meta.url), 'utf8');

test('focus stylesheet and improvement action load from the chat workspace', () => {
  assert.match(app, /stellar-focus-v1\.css\?v=20261011-1/);
  assert.match(app, /stellar-focus-v1\.js\?v=20261011-1/);
  assert.match(css, /\.side-primary\{display:none!important\}/);
  assert.match(css, /#newChatBtn\{/);
  assert.match(css, /\.side-history\{order:2!important/);
  assert.match(css, /\.composer-mode-row\{display:none!important\}/);
  assert.match(css, /#jarvis-text-sidebar\[data-locked="true"\]/);
});

test('improve button drafts an editable request without automatically sending it', () => {
  assert.match(js, /data-message-action="improve-draft"/);
  assert.match(js, /prompt\.value = /);
  assert.match(js, /prompt\.dispatchEvent\(new Event\('input'/);
  assert.match(js, /Replace your unsent draft/);
  assert.doesNotMatch(js, /sendMessage\(|\.submit\(|requestSubmit\(/);
});

test('landing page focuses on main chat, model value, pricing, and proof', () => {
  assert.match(home, /One simple place to think, create and get things done/);
  assert.match(home, /stellar-focused-homepage-20261011/);
  assert.doesNotMatch(home, /class="script-fix-promo"/);
  assert.doesNotMatch(home, /class="section plan-workflows"/);
  assert.doesNotMatch(home, /class="section landing-assurance"/);
  assert.doesNotMatch(home, /id="stellar-models"|id="ventures"|id="jarvis"/);
  assert.match(home, /stellar-homepage-minimal-20261011\\.css/);
  assert.match(home, /class="developer-preview-collapse"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /id="anonymous-preview-form"/);
});
