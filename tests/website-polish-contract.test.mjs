import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('homepage explains Stellar fast without repeating conversion clutter', () => {
  assert.match(landing, /AI for real work\./);
  assert.match(landing, /Ask, build, automate and solve problems from one focused workspace\./);
  assert.match(landing, /Message Stellar AI/);
  assert.match(landing, /Open Stellar AI/);
  assert.match(landing, /See pricing/);
  assert.match(landing, /id="stellar-home-calm-v16"/);
  assert.match(landing, /\.oa2-business-first,[\s\S]*\.oa2-delivery,[\s\S]*\.oa2-guides,[\s\S]*\.oa2-business,[\s\S]*updates-title[^}]*\{display:none!important\}/);
  assert.match(landing, /What Stellar helps you do\./);
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
  assert.match(palette, /Pricing layout polish v12/);
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

test('business palette follows older themes and the finishing layer retains the neutral palette', () => {
  const styles = [...landing.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(styles.at(-2), '/stellar-business-palette.css?v=12');
  assert.equal(styles.at(-1), '/lib/assets/stellar-refinements.css?v=20260924');
  assert.doesNotMatch(palette, /#(?:d4af37|f2d675|f4d676|8f6b1e|b8860b)/i);
  assert.match(palette, /Business homepage final neutral override v9/);
  assert.match(palette, /Pricing layout polish v12/);
});

test('business homepage keeps the executive premium presentation layer', () => {
  assert.match(palette, /Executive premium layer v11/);
  assert.match(palette, /\.public-home \.site-header \.nav/);
  assert.match(palette, /\.public-home \.final-cta/);
  assert.match(landing, /Clear answers before you choose\./);
  assert.match(landing, /Bring the work\./);
});


test('public landing presents StellarX instead of private Jarvis branding', () => {
  assert.match(landing, /STELLARX WORK AGENT/);
  assert.match(landing, /Use StellarX when a normal chat needs to become real work\./);
  assert.match(landing, /href="#stellarx-home">StellarX<\/a>/);
  assert.doesNotMatch(landing, /JARVIS ASSISTANT|Jarvis helps when the work needs action|Open Jarvis|#jarvis-home/);
});
