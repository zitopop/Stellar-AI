import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const endpoint = readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('billing portal is authenticated and resolves Stripe customer from a paid plan or Server Pass', () => {
  assert.match(endpoint, /requireSession\(req, res\)/);
  assert.match(endpoint, /stellar:user:\$\{sessionUser\.email\}/);
  assert.match(endpoint, /isPaidPlan\(user\.plan\)/);
  assert.match(endpoint, /stellar:server-pass:\$\{sessionUser\.email\}/);
  assert.match(endpoint, /serverPassUser\?\.checkoutSessionId/);
  assert.match(endpoint, /serverPassUser\?\.stripeCustomerId/);
  assert.match(endpoint, /serverPassCheckoutCustomerId/);
  assert.match(endpoint, /existingCustomerId = \/\^cus_\[A-Za-z0-9\]\+\$\/\.test\(accountCustomerId\)/);
  assert.doesNotMatch(endpoint, /req\.body[^\n]*customer/i);
});

test('portal allows payment invoice and cancellation self-service without plan switching', () => {
  assert.match(endpoint, /payment_method_update:\s*\{ enabled: true \}/);
  assert.match(endpoint, /invoice_history:\s*\{ enabled: true \}/);
  assert.match(endpoint, /subscription_cancel:[\s\S]*?enabled: true,[\s\S]*?mode: 'at_period_end'/);
  assert.match(endpoint, /subscription_update:\s*\{ enabled: false \}/);
});

test('app exposes billing management for paid plans and Server Pass and validates Stripe host', () => {
  assert.match(endpoint, /stripe\.billingPortal\.sessions\.create/);
  assert.match(endpoint, /return_url: 'https:\/\/trystellarai\.com\/app'/);
  assert.match(app, /paid=\['starter','plus','pro'\]\.includes\(planState\.plan\)/);
  assert.match(app, /serverPass\.manageable\?'<button[^']+Manage Server Pass/);
  assert.match(app, /id="set-billing-row"[^>]*data-action="open-billing"/);
  assert.match(app, /async function openBillingPortal\(\)/);
  assert.match(app, /JSON\.stringify\(\{plan:'manage-billing'\}\)/);
  assert.match(app, /portalUrl\.hostname!=='billing\.stripe\.com'/);
  assert.match(app, /Card, invoices &amp; cancellation/);
});
