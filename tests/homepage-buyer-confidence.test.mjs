import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('homepage keeps concise buyer confidence next to pricing', () => {
  assert.match(landing, /STELLAR WORKSPACE PLANS/);
  assert.match(landing, /No card for Free/);
  assert.match(landing, /Secure Stripe checkout/);
  assert.match(landing, /Cancel anytime/);
  assert.match(landing, /Simple usage meter/);
  assert.match(landing, /Start free\. Upgrade when Stellar becomes part of your day\./);
  assert.match(landing, /href="\/support"/);
  assert.doesNotMatch(landing, /BUYER CONFIDENCE/);
});

test('homepage pricing remains styled and mobile-safe', () => {
  assert.match(palette, /pricing/i);
  assert.match(landing, /class="plans"/);
  assert.match(landing, /data-plan="free"/);
  assert.match(landing, /data-plan="starter"/);
  assert.match(landing, /data-plan="plus"/);
  assert.match(landing, /data-plan="pro"/);
  assert.match(landing, /@media\(max-width:560px\)/);
});
