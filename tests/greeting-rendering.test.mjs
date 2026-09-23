import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace keeps the help question for signed-out users', () => {
  assert.match(app, /What can Stellar help you build\?/);
});

test('signed-in greeting uses only a sanitized first name', () => {
  assert.match(app, /function safeFirstName\(user\)/);
  assert.match(app, /slice\(0,30\)/);
  assert.match(app, /name\?name\+', what can Stellar help you build\?'/);
  assert.doesNotMatch(app, /greeting\.textContent=signedInUser\.email/);
});
