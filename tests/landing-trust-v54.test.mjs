import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-landing-trust-v54.css', import.meta.url), 'utf8');

test('landing leads with a specific FiveM and Roblox value proposition', () => {
  assert.match(home, /BUILT FOR FIVEM \+ ROBLOX DEVELOPERS/);
  assert.match(home, /Generate &amp; debug<br><span>FiveM \+ Roblox code\.<\/span>/);
  assert.match(home, /QBCore, ESX, ox_lib and Roblox Luau/);
  assert.match(home, /See real code demo/);
});

test('hero makes pricing and buyer protections visible without a second click', () => {
  assert.match(home, /Free · no card/);
  assert.match(home, /Starter from £8\/mo/);
  assert.match(home, /Secure Stripe checkout/);
  assert.match(home, /href="\/refunds">Refund policy/);
  assert.match(home, /100 credits\/day · up to 30 requests\/hour/);
  assert.match(home, /5,000 credits\/month · up to 120 requests\/hour/);
});

test('trust layer uses verifiable product evidence instead of invented social proof', () => {
  assert.match(home, /WHY TRUST STELLAR/);
  assert.match(home, /See what you get before you pay\./);
  assert.match(home, /Real product preview/);
  assert.match(home, /Transparent pricing/);
  assert.match(home, /Public GitHub/);
  assert.match(home, /Public support \+ policies/);
  assert.match(home, /github\.com\/zitopop\/Stellar-AI/);
  assert.match(home, /href="\/status">Service status/);
  assert.match(home, /href="\/privacy">Privacy/);
  assert.match(home, /href="\/terms">Terms/);
  assert.match(home, /href="\/support">Support/);
  assert.doesNotMatch(home, /trusted by \d|join \d[\d,]*\+|thousands of developers/i);
});

test('developer showcase no longer presents business services as an equal product pillar', () => {
  const showcase = home.match(/<section class="stellar-showcase[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(showcase, /03 · DEBUG/);
  assert.match(showcase, /Paste the error\. Get the smallest safe fix\./);
  assert.doesNotMatch(showcase, /AI receptionist|Website audit|Inbox closer/i);
});

test('business tools are explicitly separate and still discoverable', () => {
  const business = home.match(/<section class="stellar-business-entry[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(business, /SEPARATE BUSINESS TOOLS/);
  assert.match(business, /Running a business too\? Stellar has a separate toolkit\./);
  assert.match(business, /Website Audit \/ Quick Fix/);
  assert.match(business, /AI Business Website/);
  assert.match(business, /AI Receptionist/);
});

test('trust layout is responsive and restrained', () => {
  assert.match(css, /\.landing-trust-grid/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});


test('developer pricing appears before the separate business toolkit', () => {
  const pricing = home.indexOf('<section class="section container pricing-section');
  const business = home.indexOf('<section class="stellar-business-entry');
  const faq = home.indexOf('<section class="section container faq-section');
  assert.ok(pricing >= 0 && business > pricing, 'business tools should appear after developer pricing');
  assert.ok(faq > business, 'business tools should remain before FAQ');
});
