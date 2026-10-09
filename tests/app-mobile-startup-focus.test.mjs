import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const startup = app.slice(app.lastIndexOf('async function init()'));

test('mobile app startup does not autofocus the composer or summon the keyboard', () => {
  assert.match(startup, /if\(matchMedia\('\(min-width:901px\)'\)\.matches&&!requestedAccount&&!previewAuthGateRequested\)prompt\.focus\(\)/);
  assert.doesNotMatch(startup, /;prompt\.focus\(\)\}init\(\)/);
});

test('New chat still closes the phone drawer and prevents iOS focus zoom', () => {
  assert.match(app, /function resetNewChatView\(\)\{const mobile=matchMedia\('\(max-width:900px\)'\)\.matches/);
  assert.match(app, /if\(!mobile\)\{prompt\.focus\(\);return\}closeSide\(\)/);
  assert.match(app, /<style id="stellar-mobile-new-chat-zoom-v83">[\s\S]*?#prompt\{font-size:16px!important\}/);
});
