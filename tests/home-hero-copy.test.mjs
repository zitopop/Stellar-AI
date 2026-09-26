import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero uses current help-first copy', () => {
  assert.match(app, /id="homeGreeting">What can I help with\?<\/h1>/);
  assert.match(app, /class="home-hint">Type what you need below\. Use StellarX when you want the AI to build, fix or work with files and apps\.<\/p>/);
  assert.match(app, /class="home-actions"/);
  assert.match(app, /function updateGreeting\(\)/);
});
