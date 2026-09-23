import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('homepage explains Stellar fast with product, pricing and trust anchors', () => {
  assert.match(landing, /AI coding workspace for FiveM and Roblox/);
  assert.match(landing, /Build\. Automate\. Get real work done\./);
  assert.match(landing, /Message Stellar AI/);
  assert.match(landing, /Start with Stellar/);
  assert.match(landing, /Business services such as the AI Receptionist and Website Mini Audit are priced separately above\./);
  assert.match(landing, /Wallet credit is separate and can be used after the included allowance\./);
  assert.match(landing, /No fake tested claims|No fabricated results/);
  assert.match(landing, /href="\/support"[^>]*>Support<\/a>/i);
});

test('public website palette keeps a clean AI product direction', () => {
  assert.match(palette, /calm product UI, not black\/gold template/);
  assert.match(palette, /--stellar-accent:#8b7cf6/);
  assert.match(palette, /--stellar-bg:#0d0f14/);
  assert.match(palette, /\.public-home \.oa2-hero/);
  assert.match(palette, /\.public-home \.pricing-section::after/);
  assert.match(palette, /Plans and wallet credit do different jobs/);
  assert.match(palette, /Stripe handles checkout/);
  assert.match(palette, /\.public-home \.plans\{display:grid!important/);
  assert.match(palette, /@media\(max-width:700px\)/);
});

test('website polish does not reintroduce heavy gold lock styling', () => {
  assert.doesNotMatch(palette, /background:\s*linear-gradient\([^;]*(?:#d4af37|gold)[^;]*\)!important/i);
  assert.doesNotMatch(palette, /box-shadow:[^;]*(?:gold|#d4af37|#b8860b)/i);
  assert.match(palette, /Gold is kept only as a tiny warm accent/);
});
