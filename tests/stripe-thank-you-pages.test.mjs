import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const pages = {
  'thank-you.html': ['Payment received', 'Stripe receipt', '/app?payment=success', 'Billing support'],
  'business-thank-you.html': ['Stripe receipt', 'Send details', '/business'],
  'ai-receptionist-thank-you.html': ['Stripe receipt', 'Send setup details', '/ai-receptionist'],
  'website-audit-thank-you.html': ['Stripe receipt', 'Send audit details', '/website-audit'],
};

for (const [page, requiredText] of Object.entries(pages)) {
  test(`${page} gives a professional post-payment path`, () => {
    const html = read(page);
    assert.match(html, /<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*">/);
    assert.match(html, /stripe|payment/i);
    assert.match(html, /href="\/support\?topic=billing"|Billing support|Support/i);
    for (const text of requiredText) assert.ok(html.includes(text), `${page} missing ${text}`);
    assert.doesNotMatch(html, /https:\/\/stripe\.com["']/i, `${page} should keep customers on Stellar after payment`);
  });
}

test('business thank-you pages ask for fulfilment details instead of making fake guarantees', () => {
  const receptionist = read('ai-receptionist-thank-you.html');
  const audit = read('website-audit-thank-you.html');
  assert.match(receptionist, /Business facts/);
  assert.match(receptionist, /must never say/);
  assert.match(audit, /no fake traffic or revenue promises/i);
});
