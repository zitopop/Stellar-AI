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

test('app home stays chat-first and exposes real Computer and Plugins entry points', () => {
  assert.match(app, /What can Stellar help you get done\?/);
  assert.match(app, /openComputerActionCard/);
  assert.match(app, />▣ Computer</);
  assert.match(app, />⌘ Plugins</);
  assert.match(app, /space-home-subtitle,.app \.space-home-chips,.app \.space-home-cards\{display:none/);
  assert.match(app, /Review computer action/);
});