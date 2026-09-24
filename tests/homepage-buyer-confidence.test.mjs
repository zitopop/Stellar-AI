import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage keeps buyer trust without a duplicate confidence section', () => {
  const businessIndex = landing.indexOf('id="business-home"');
  const pricingIndex = landing.indexOf('id="plans"');
  assert.ok(businessIndex >= 0 && pricingIndex > businessIndex);
  assert.match(landing, /Practical AI services with clear scope and pricing\./);
  assert.match(landing, /Clear scope/);
  assert.match(landing, /Human review/);
  assert.match(landing, /Permissioned actions/);
  assert.match(landing, /Secure Stripe checkout/);
  assert.match(landing, /No card for Free/);
  assert.match(landing, /Cancel anytime/);
  assert.match(landing, /Wallet credit stays separate/);
  assert.doesNotMatch(landing, /BUYER CONFIDENCE/);
  assert.doesNotMatch(landing, /class="oa2-delivery container"/);
});

test('business services stay visible before workspace pricing', () => {
  assert.match(landing, /AI RECEPTIONIST/);
  assert.match(landing, /WEBSITE MINI AUDIT/);
  assert.match(landing, /£150 setup \+ £49\/month/);
  assert.match(landing, /£99 one-time/);
});
