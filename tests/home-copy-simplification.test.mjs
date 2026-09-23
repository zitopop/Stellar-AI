import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('home copy stays focused on one clear prompt', () => {
  assert.match(app, /What can Stellar help you get done\\?/);
  assert.match(app, /Tell Stellar the business task, workflow, question or technical job you want help with\\./);
  assert.match(app, /placeholder="Message Stellar AI…"/);
});

test('old quick-start grid is removed', () => {
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.doesNotMatch(app, />Project plan<\/button>/);
});
