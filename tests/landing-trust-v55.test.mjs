import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-landing-trust-v55.css', import.meta.url), 'utf8');

test('v55 hero is specific, useful and low-friction', () => {
  assert.match(home, /AI FOR FIVEM \+ ROBLOX DEVELOPERS/);
  assert.match(home, /Build &amp; fix<br><span>FiveM \+ Roblox scripts\.<\/span>/);
  assert.match(home, /Generate secure QBCore, ESX, ox_lib and Roblox Luau/);
  assert.match(home, /placeholder="Describe a script or paste an error…"/);
  assert.match(home, /class="oa2-primary-action">Try Stellar free/);
  assert.match(home, /class="oa2-secondary-action">See code demo/);
});

test('v55 explains the workflow in three concrete steps', () => {
  const block = home.match(/<section class="landing-how[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(block, /HOW IT WORKS/);
  assert.match(block, /Describe it or paste the error/);
  assert.match(block, /Inspect the output/);
  assert.match(block, /Copy or export/);
  assert.equal((block.match(/<article>/g) || []).length, 3);
});

test('v55 trust language is confident and verifiable', () => {
  assert.match(home, /Try it first\. Check the facts\. Then decide\./);
  assert.match(home, /product preview, pricing, service status and policies are public/);
  assert.match(home, /Starter £8\/mo/);
  assert.match(home, /Secure Stripe checkout/);
  assert.match(home, /Cancel from Billing/);
  assert.match(home, /Refund policy/);
  assert.doesNotMatch(home, /No invented testimonials/);
});

test('v55 styling stays compact and responsive', () => {
  assert.match(css, /\.landing-how-grid/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});


test('v55 keeps navigation and final CTA developer-focused', () => {
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  const finalCta = home.match(/<section class="container final-cta">[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(header, /href="\/blog">Guides<\/a>/);
  assert.match(home, /Real product preview · inspect before use/);
  assert.match(finalCta, /Try one message\./);
  assert.match(finalCta, /Try Stellar free/);
  assert.match(finalCta, /Compare plans/);
  assert.doesNotMatch(finalCta, /Explore Business AI/);
  assert.doesNotMatch(home, /href="\/investors">Investors<\/a>/);
  assert.doesNotMatch(home, /href="\/affiliate">Creator & referrals<\/a>/);
});
