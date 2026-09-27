import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const support = readFileSync(new URL('../support.html', import.meta.url), 'utf8');

test('support page explains each help route clearly', () => {
  for (const text of [
    'Know exactly where to get help.',
    'Account access',
    'Plans and billing',
    'Credits and top-ups',
    'App bugs',
    'Refunds and cancellation',
    'Projects and scripts',
    'Discord giveaway or promo credits'
  ]) {
    assert.ok(support.includes(text), text);
  }
});

test('support page keeps safe contact flow and support email templates', () => {
  assert.match(support, /deadlyfox10@gmail\.com/);
  assert.match(support, /Do not send passwords, secret keys, payment card numbers, or private API tokens/);
  assert.match(support, /const templates=/);
  assert.match(support, /Stellar AI credits help/);
  assert.match(support, /Stellar AI bug report/);
  assert.match(support, /Stellar AI refund or cancellation help/);
});

test('support page explains credits and owner-tool meaning', () => {
  assert.match(support, /Free resets daily at midnight UK time\. Paid plan credits reset monthly/);
  assert.match(support, /Wallet credits<\/strong> are bought top-ups and stay until used/);
  assert.match(support, /Paid plans use monthly allowances and unlock higher models/);
  assert.match(support, /Owner tools<\/strong> stay private and are not visible to normal users/);
  assert.match(support, /Promo credits<\/strong> can be used for Discord\/community rewards/);
});
