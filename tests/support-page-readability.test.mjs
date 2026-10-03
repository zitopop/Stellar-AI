import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const support = fs.readFileSync(new URL('../support.html', import.meta.url), 'utf8');

test('support page explains contact, billing, account and app help clearly', () => {
  assert.match(support, /Support centre/i);
  assert.match(support, /Contact support/i);
  assert.match(support, /deadlyfox10@gmail\.com/);
  assert.match(support, /Plans and billing/i);
  assert.match(support, /Account/i);
  assert.match(support, /Open Stellar app/i);
});

test('support page has mobile-friendly controls and mail actions', () => {
  assert.match(support, /min-height:44px/);
  assert.match(support, /openSupportEmail/);
  assert.match(support, /copyEmail/);
  assert.match(support, /sendWrittenRequest/);
});
