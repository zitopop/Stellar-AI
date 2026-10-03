import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const pages = {
  'thank-you.html': ['Payment received', 'Stripe receipt', '/app?payment=success', 'Billing support'],
  'business-thank-you.html': ['Stripe receipt', 'Send details', '/business'],
  'ai-receptionist-thank-you.html': ['Stripe receipt', 'automatically creates a setup job', '/ai-receptionist'],
  'website-audit-thank-you.html': ['Stripe receipt', 'automatically creates an audit job', '/website-audit'],
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

test('business thank-you pages explain automatic fulfilment without making fake guarantees', () => {
  const receptionist = read('ai-receptionist-thank-you.html');
  const audit = read('website-audit-thank-you.html');
  assert.match(receptionist, /Business facts/);
  assert.match(receptionist, /first configuration stays reviewable/i);
  assert.match(audit, /no fake traffic or revenue promises/i);
  assert.doesNotMatch(receptionist, /mailto:support@trystellarai\.com/i);
  assert.doesNotMatch(audit, /mailto:support@trystellarai\.com/i);
});
