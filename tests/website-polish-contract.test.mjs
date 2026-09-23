import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('homepage explains Stellar fast with product, pricing and trust anchors', () => {
  assert.match(landing, /AI systems for real business work\./);
  assert.match(landing, /BUSINESS AI · AUTOMATION · AGENTS · SOFTWARE WORKSPACE/);
  assert.match(landing, /Message Stellar AI/);
  assert.match(landing, /Open Stellar AI/);
  assert.match(landing, /href="\/ai-receptionist"/);
  assert.match(landing, /href="\/website-audit"/);
  assert.match(landing, /Wallet credit is separate from the included hourly allowance/);
  assert.match(landing, /No fake tested claims|No fabricated results/);
  assert.match(landing, /Stripe checkout/);
  assert.match(landing, /Cancel anytime/);
  assert.match(landing, /Email support/);
  assert.match(landing, /href="\/support"[^>]*>Support<\/a>/i);
});

test('public website palette keeps a clean AI product direction', () => {
  assert.match(palette, /business-first dark product UI\. No yellow\/gold brand lock/);
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
  assert.match(palette, /Business homepage final neutral override v9/);
});


test('homepage final polish layer beats old decorative styling', () => {
  const cosmic = readFileSync(new URL('../lib/assets/stellar-cosmic-openai.css', import.meta.url), 'utf8');
  assert.match(cosmic, /Stellar public homepage final polish v20260923-clean-home/);
  assert.match(cosmic, /body\.public-home \.oa2-hero/);
  assert.match(cosmic, /html:has\(body\.public-home\)::after/);
  assert.match(cosmic, /body\.public-home \.pricing-section \.plans/);
  assert.match(cosmic, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(cosmic, /@media\(max-width:700px\)/);
  assert.match(cosmic, /home conversion proof row v20260923/);
  assert.match(cosmic, /body\.public-home \.oa2-proof-row/);
});

test('business palette loads last and contains no legacy gold brand values', () => {
  const styles = [...landing.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(styles.at(-1), '/stellar-business-palette.css?v=9');
  assert.doesNotMatch(palette, /#(?:d4af37|f2d675|f4d676|8f6b1e|b8860b)/i);
  assert.match(palette, /Business homepage final neutral override v9/);
});
