import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero uses current help-first copy', () => {
  assert.match(app, /id="homeGreeting">What can Stellar help you get done\?<\/h1>/);
  assert.ok(app.includes('Ask a question, plan a workflow, review a page or get technical help.'));
  assert.match(app, /function updateGreeting\(\)/);
});
