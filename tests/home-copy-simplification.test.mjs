import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('home copy stays focused on one clear prompt', () => {
  assert.match(app, /What can Stellar help you build\?/);
  assert.match(app, /Tell Stellar what you want to build, fix or automate\./);
  assert.match(app, /placeholder="Message Stellar AI…"/);
});

test('old quick-start grid is removed', () => {
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.doesNotMatch(app, />Project plan<\/button>/);
});
