import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const support = readFileSync(new URL('../support.html', import.meta.url), 'utf8');
const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');

test('support page explains routes and keeps a clean help layout', () => {
  assert.match(support, /Support that tells you what is what/);
  assert.match(support, /Settings help/);
  assert.match(support, /Credits and top-ups/);
  assert.match(support, /Discord promo credits/);
  assert.match(support, /What is what\?/);
  assert.match(support, /Do not send passwords, secret keys, payment card numbers, or private API tokens/);
  assert.match(support, /support-layout/);
  assert.match(support, /route-grid/);
  assert.match(support, /what-grid/);
  assert.match(support, /deadlyfox10@gmail\.com/);
});

test('settings polish keeps layout clean on desktop and phone', () => {
  assert.match(analytics, /stellar-settings-polish-v1/);
  assert.match(analytics, /Workspace controls/);
  assert.match(analytics, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(analytics, /settings-wide/);
  assert.match(analytics, /credit-buy-controls/);
  assert.match(analytics, /settings-wallet-row/);
  assert.match(analytics, /data-settings-panel/);
  assert.match(analytics, /Owner perks explained/);
  assert.match(analytics, /Custom credits/);
  assert.match(analytics, /Choose £3–£200 in 50p steps/);
});
