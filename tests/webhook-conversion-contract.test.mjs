import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webhook = fs.readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');
const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const broadcast = fs.readFileSync(new URL('../api/broadcast.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const metrics = fs.readFileSync(new URL('../lib/conversion-metrics.js', import.meta.url), 'utf8');

test('Stripe webhook records aggregate successful conversion counters', () => {
  assert.match(metrics, /function conversionMetricKey\(name, date = new Date\(\)\)/);
  assert.match(metrics, /stellar:conversion:\$\{dayKey\(date\)\}/);
  assert.match(webhook, /incrementConversionMetric/);
  assert.match(webhook, /topup-completed/);
  assert.match(webhook, /subscription-completed/);
  assert.match(webhook, /revenue-pence/);
});

test('conversion counters remain behind Stripe signature validation and duplicate protection', () => {
  assert.match(webhook, /stripe\.webhooks\.constructEvent/);
  assert.match(webhook, /if \(await kvGet\(eventKey\(event\.id\)\)\)/);
  assert.match(webhook, /await kvSet\(eventKey\(event\.id\)/);
});

test('the payment funnel tracks starts, cancelled or expired sessions, and owner-only reads', () => {
  assert.match(checkout, /incrementConversionMetric\('checkout-started'\)/);
  assert.match(webhook, /event\.type === 'checkout\.session\.expired'/);
  assert.match(webhook, /incrementConversionMetric\('checkout-cancelled-or-expired'\)/);
  assert.match(broadcast, /req\.body\?\.action === 'conversionMetrics'/);
  assert.match(broadcast, /readConversionMetrics/);
});

test('the app keeps conversion totals inside owner tools', () => {
  assert.match(app, /data-otab="metrics"/);
  assert.match(app, /loadConversionMetrics\(\)/);
  assert.match(app, /action: 'conversionMetrics'/);
});
