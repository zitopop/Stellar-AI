import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('current clean composer is explicit and text-first', () => {
  assert.match(app, /<label class="hidden" for="prompt">Message Stellar<\/label>/);
  assert.match(app, /id="prompt" maxlength="8000"/);
  assert.match(app, /id="sendBtn" type="submit" aria-label="Send"/);
  assert.doesNotMatch(app, /id="image-upload-input"/);
  assert.doesNotMatch(app, /id="image-upload-btn"/);
});

test('chat request does not send a phantom image payload', () => {
  assert.match(app, /messages:s\.messages\.slice\(-16\)/);
  assert.doesNotMatch(app, /image:requestImage/);
  assert.doesNotMatch(app, /uploadedImage/);
});

test('composer remains keyboard accessible and mobile safe', () => {
  assert.match(app, /if\(e\.key==='Enter'&&!e\.shiftKey\)\{e\.preventDefault\(\);sendMessage\(prompt\.value\)\}/);
  assert.match(app, /@media\(max-width:540px\)/);
  assert.match(app, /\.composer\{grid-template-columns:1fr auto/);
  assert.match(app, /touch-action:manipulation/);
});
