import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('purchase status endpoint verifies Stripe and exposes only safe fulfilment state', () => {
  const full = read('api/create-checkout.js');
  const start = full.indexOf('function purchaseProduct');
  const end = full.indexOf('export default async function handler');
  const source = full.slice(start, end);
  assert.match(source, /checkout\.sessions\.retrieve\(sessionId\)/);
  assert.match(source, /loadBusinessFulfillmentJob/);
  assert.match(source, /website-builder/);
  assert.match(source, /server-pass/);
  assert.match(source, /normalisePlan/);
  assert.match(source, /waiting_for_customer/);
  assert.match(source, /needs_owner_review/);
  assert.match(source, /Do not pay again/);
  assert.doesNotMatch(source, /customerEmail\s*:/);
  assert.doesNotMatch(source, /stripeCustomerId\s*:/);
});

test('business thank-you pages show live verified fulfilment status', () => {
  for (const page of ['website-audit-thank-you.html', 'ai-receptionist-thank-you.html']) {
    const html = read(page);
    assert.match(html, /data-purchase-status/);
    assert.match(html, /stellar-purchase-status-v1\.js/);
    assert.match(html, /Stripe receipt/);
  }
  const widget = read('lib/assets/stellar-purchase-status-v1.js');
  assert.match(widget, /\/api\/create-checkout\?action=purchase-status&session_id=/);
  assert.match(widget, /You do not need to pay again/);
  assert.match(widget, /history\.replaceState/);
});

test('website builder returns a checkout session and verifies it before waiting for entitlement', () => {
  const checkout = read('api/create-checkout.js');
  const builder = read('business-builder.html');
  assert.match(checkout, /business-builder\?payment=success&session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(builder, /\/api\/create-checkout\?action=purchase-status&session_id=/);
  assert.match(builder, /do not buy again/i);
  assert.match(builder, /\/api\/get-plan/);
});

test('Server Pass checkout return reports activation readiness instead of a vague success message', () => {
  const html = read('server-pass.html');
  assert.match(html, /dataset\.purchaseStatus/);
  assert.match(html, /stellar-purchase-status-v1\.js/);
  assert.match(html, /Confirming your Server Pass/);
});

test('signed-in Settings can show recent paid business service progress', () => {
  const plan = read('api/get-plan.js');
  const app = read('app.html');
  assert.match(plan, /listBusinessFulfillmentJobs/);
  assert.match(plan, /businessOrders/);
  assert.doesNotMatch(plan, /businessOrders[\s\S]{0,300}customerEmail/);
  assert.match(app, /settingsBusinessOrdersMarkup/);
  assert.match(app, /Needs your info · check email/);
  assert.match(app, /Retrying automatically/);
});


test('purchase-status GET bypasses the public business checkout guard', () => {
  const checkout = read('api/create-checkout.js');
  assert.match(checkout, /const purchaseStatusRequest = req\.method === 'GET' && action === 'purchase-status'/);
  assert.match(checkout, /req\.method === 'GET' && !publicBusinessCheckout && !purchaseStatusRequest/);
  const guard = checkout.indexOf("!publicBusinessCheckout && !purchaseStatusRequest");
  const statusHandler = checkout.indexOf("if (purchaseStatusRequest)");
  assert.ok(guard >= 0 && statusHandler > guard, 'purchase-status requests must survive the GET checkout guard');
});
