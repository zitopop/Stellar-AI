import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const palette = readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('homepage has a buyer confidence path before pricing', () => {
  assert.match(landing, /BUYER CONFIDENCE/);
  assert.match(landing, /Know exactly what happens next\./);
  assert.match(landing, /Stellar keeps every paid step clear/);
  assert.match(landing, /Start with a specific job\./);
  assert.match(landing, /See the scope before relying on it\./);
  assert.match(landing, /Pay safely and keep support close\./);
  assert.match(landing, /Checkout is handled by Stripe/);
  assert.match(landing, /support stays on the Stellar site/);
  assert.match(landing, /avoid fake guarantees about rankings, leads or revenue/);
  assert.match(landing, /href="\/website-audit">See Website Mini Audit/);
  assert.match(landing, /href="\/ai-receptionist">See AI Receptionist/);
});

test('buyer confidence section is styled and mobile-safe', () => {
  assert.match(palette, /Buyer confidence delivery section v1/);
  assert.match(palette, /\.public-home \.oa2-delivery-grid/);
  assert.match(palette, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(palette, /@media\(max-width:900px\)/);
  assert.match(palette, /@media\(max-width:700px\)/);
});
