import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../MONETIZATION_APPROVAL.md', import.meta.url), 'utf8');

test('Stripe returns identify payment state and purchased plan', () => {
  assert.match(checkout, /payment=success/);
  assert.match(checkout, /payment=cancelled/);
  assert.match(checkout, /encodeURIComponent\(plan\)/);
});

test('top-up UI uses the backend contract limits and corrected pack totals', () => {
  assert.match(app, /id="topup-range" min="50" max="20000"/);
  assert.match(app, /£11\.00 credit/);
  assert.match(app, /£28\.75 credit/);
  assert.match(app, /£60\.00 credit/);
});

test('repository policy requires review before monetization publication', () => {
  assert.match(policy, /prepare, review, approve, then publish/i);
  assert.match(policy, /must not push changes to `main`/i);
  assert.match(policy, /api\//);
  assert.match(policy, /webhook/i);
});
