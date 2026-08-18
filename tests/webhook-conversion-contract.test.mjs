import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webhook = fs.readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');

test('Stripe webhook records aggregate successful conversion counters', () => {
  assert.match(webhook, /function conversionKey\(name, date = new Date\(\)\)/);
  assert.match(webhook, /stellar:conversion:\$\{date\.toISOString\(\)\.slice\(0, 10\)\}/);
  assert.match(webhook, /topup-completed/);
  assert.match(webhook, /subscription-completed/);
  assert.match(webhook, /revenue-pence/);
});

test('conversion counters remain behind Stripe signature validation and duplicate protection', () => {
  assert.match(webhook, /stripe\.webhooks\.constructEvent/);
  assert.match(webhook, /if \(await kvGet\(eventKey\(event\.id\)\)\)/);
  assert.match(webhook, /await kvSet\(eventKey\(event\.id\)/);
});
