import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero uses current help-first copy', () => {
  assert.match(app, /id="homeGreeting">What can Stellar help you build\?<\/h1>/);
  assert.match(app, /Tell Stellar what you want to build, fix or automate\./);
  assert.match(app, /function updateGreeting\(\)/);
});
