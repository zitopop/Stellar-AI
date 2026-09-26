import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero stays simple and explains the tools once', () => {
  assert.match(app, /id="homeGreeting">What can I help with\?<\/h1>/);
  assert.match(app, /id="welcome-copy" class="home-hint">Ask anything\. Use \+ for voice, images, StellarX or plugins\.<\/p>/);
  assert.match(app, /\.app \.home-hint\{display:block!important/);
  assert.doesNotMatch(app, /class="home-actions"/);
  assert.match(app, /function homeWelcomeMarkup\(\)/);
  assert.match(app, /function updateGreeting\(\)/);
});
