import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const callCss = readFileSync(new URL('../lib/assets/stellar-call.css', import.meta.url), 'utf8');
const smoothCss = readFileSync(new URL('../lib/assets/stellar-smooth-smart.css', import.meta.url), 'utf8');

test('top model picker stays readable instead of collapsing to a dot', () => {
  assert.match(callCss, /Compact top bar/);
  assert.match(callCss, /#current-model-label\{[\s\S]*?position:static!important/);
  assert.match(callCss, /max-width:min\(42vw,300px\)!important/);
  assert.doesNotMatch(callCss, /width:44px!important;[\s\S]{0,250}#current-model-label[\s\S]{0,250}position:absolute!important/);
});

test('chat workspace has no giant decorative planet or one-pixel star dot', () => {
  assert.match(smoothCss, /\.app \.main::after\{content:none!important;display:none!important;\}/);
  assert.doesNotMatch(smoothCss, /\.app \.main::before\{[^}]*radial-gradient\(circle at 30% 18%/);
});

test('chat rename uses a Stellar dialog instead of the browser prompt', () => {
  const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  assert.match(app, /id="stellar-rename-dialog-v1"/);
  assert.match(app, /rename-chat-modal/);
  assert.doesNotMatch(app, /\bprompt\s*\(/);
});