import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const endpoint = readFileSync(new URL('../api/billing-portal.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('billing portal is authenticated and resolves the Stripe customer only from server profile state', () => {
  assert.match(endpoint, /requireSession\(req, res\)/);
  assert.match(endpoint, /stellar:user:\$\{session\.email\}/);
  assert.match(endpoint, /isPaidPlan\(user\.plan\)/);
  assert.match(endpoint, /user\.stripeCustomerId/);
  assert.match(endpoint, /\^cus_/);
  assert.doesNotMatch(endpoint, /req\.body[^\n]*customer/i);
});

test('billing portal allows safe self-service tasks without generic plan switching', () => {
  assert.match(endpoint, /payment_method_update:\s*\{ enabled: true \}/);
  assert.match(endpoint, /invoice_history:\s*\{ enabled: true \}/);
  assert.match(endpoint, /subscription_cancel:[\s\S]*?enabled: true,[\s\S]*?mode: 'at_period_end'/);
  assert.match(endpoint, /subscription_update:\s*\{ enabled: false \}/);
  assert.match(endpoint, /cancellation_reason:[\s\S]*?enabled: true/);
});

test('billing portal returns only a Stripe-hosted billing URL to the app', () => {
  assert.match(endpoint, /stripe\.billingPortal\.sessions\.create/);
  assert.match(endpoint, /return_url: 'https:\/\/trystellarai\.com\/app'/);
  assert.match(endpoint, /\^https:\\\/\\\/billing\\\.stripe\\\.com/);
  assert.match(app, /id="set-billing-row"[^>]*onclick="openBillingPortal\(\)"/);
  assert.match(app, /fetch\('\/api\/billing-portal'/);
  assert.match(app, /portalUrl\.hostname !== 'billing\.stripe\.com'/);
});

test('billing management appears only for signed-in paid plans', () => {
  assert.match(app, /billingRow\.style\.display = signedIn && \['starter','plus','lite','pro'\]\.includes\(s\.plan\) && !isOwner\(\) \? '' : 'none'/);
  assert.match(app, /Card, invoices &amp; cancellation/);
});
