import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-smooth-smart.css', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('space theme is applied to landing and app home without using fake mockup people', () => {
  assert.match(css, /Stellar OpenAI-space theme v20260925/);
  assert.match(css, /body\.public-home::after/);
  assert.match(css, /\.app \.main::after/);
  assert.doesNotMatch(app + landing + css, /Alex Carter|alex@stellar\.ai/);
});

test('app home has cosmic capability chips and useful suggestion cards', () => {
  assert.match(app, /space-home-subtitle/);
  assert.match(app, /space-home-chips/);
  assert.match(app, /space-home-cards/);
  for (const text of ['StellarX PC Agent', 'Email Agent', 'Business workflows', 'Build a workflow', 'Fix my website']) assert.match(app, new RegExp(text));
  assert.match(app, /function setPrompt\(text\)/);
});
