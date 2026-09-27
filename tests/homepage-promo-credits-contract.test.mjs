import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');

test('homepage mentions promo and giveaway credits without cash wording', () => {
  assert.match(analytics, /promo and giveaway credits for Discord events/);
  assert.match(analytics, /Discord giveaways/);
  assert.match(analytics, /launch promos/);
  assert.match(analytics, /creator rewards|community rewards/);
  assert.doesNotMatch(analytics, /free money|cash prize|lottery/i);
});
