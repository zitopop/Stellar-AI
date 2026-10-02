import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const webhook = fs.readFileSync(new URL('../api/webhook.js', import.meta.url), 'utf8');
const metrics = fs.readFileSync(new URL('../lib/conversion-metrics.js', import.meta.url), 'utf8');
const broadcast = fs.readFileSync(new URL('../api/broadcast.js', import.meta.url), 'utf8');
const tracker = fs.readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const trackEvent = fs.readFileSync(new URL('../api/get-plan.js', import.meta.url), 'utf8');

test('checkout and webhook still record conversion events server-side', () => {
  assert.match(checkout, /incrementConversionMetric\('checkout-started'\)/);
  assert.match(checkout, /client_reference_id: attemptId/);
  assert.match(webhook, /checkout\.session\.async_payment_succeeded/);
  assert.match(webhook, /checkout\.session\.async_payment_failed/);
  assert.match(webhook, /checkout\.session\.expired/);
  assert.match(webhook, /customer\.subscription\.created/);
  assert.match(webhook, /customer\.subscription\.updated/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /invoice\.payment_failed/);
  assert.match(webhook, /recordCheckoutExpiry/);
  assert.match(metrics, /readConversionMetrics/);
});

test('owner conversion metrics and privacy-safe tracking endpoints remain available', () => {
  assert.match(broadcast, /action === 'conversionMetrics'/);
  assert.match(broadcast, /readConversionMetrics/);
  assert.match(tracker, /window\.StellarTrack = track/);
  assert.match(trackEvent, /ALLOWED_EVENTS/);
});

test('subscription access is granted only after Stripe reports a paid checkout status', () => {
  assert.match(webhook, /const subscriptionPaid = session\.payment_status === 'paid' \|\| session\.payment_status === 'no_payment_required' \|\| event\.type === 'checkout\.session\.async_payment_succeeded'/);
  assert.match(webhook, /if \(plan && subscriptionPaid\)/);
  assert.match(webhook, /Stripe subscription checkout is awaiting payment/);
});
