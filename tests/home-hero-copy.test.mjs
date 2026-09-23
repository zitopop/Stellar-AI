import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero uses current help-first copy', () => {
  assert.match(app, /id="homeGreeting">What can Stellar help you get done\?<\/h1>/);
  assert.match(app, /Tell Stellar the business task, workflow, question or technical job you want help with\./);
  assert.match(app, /function updateGreeting\(\)/);
});
