import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('home copy stays focused on one clear chat prompt', () => {
  assert.match(app, /function welcomeHtml\(\)[\s\S]*?Type below\. Press ↑ to send\./);
  assert.match(app, /placeholder="Message Stellar…"/);
  assert.match(app, /id="sendBtn"/);
});

test('old quick-start and extra tool clutter are removed', () => {
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.doesNotMatch(app, />Project plan<\/button>/);
  assert.doesNotMatch(app, /id="composer-more-btn"/);
});
