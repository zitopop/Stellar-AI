import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage itself owns the serious chat-first product UI', () => {
  assert.match(landing, /public-home/);
  assert.match(landing, /stellar-serious-chat-first-v37/);
  assert.match(landing, /Ask anything\./);
  assert.match(landing, /id="build-form"/);
  assert.match(landing, /id="plans"/);
});

test('analytics cannot rewrite homepage value or pricing copy', () => {
  assert.match(analytics, /does not rewrite product UI or pricing copy/);
  assert.doesNotMatch(analytics, /polishHomepageContent|stellar-home-focus|credit-wallet|Wallet top-ups|promo and giveaway credits/i);
});
