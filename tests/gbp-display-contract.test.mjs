import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const currency = read('currency.js');
const index = read('index.html');
const app = read('app.html');
const terms = read('terms.html');

test('currency display is GBP regardless of detected country', () => {
  assert.match(currency, /function detectCurrency\(country = detectCountry\(\)\) \{ return 'GBP'; \}/);
});

test('homepage publishes GBP prices while the app retains its currency cache version', () => {
  for (const price of [0, 8, 20, 75]) assert.ok(index.includes(`<strong>£${price}</strong>`));
  assert.doesNotMatch(index, /src="\/currency\.js/);
  assert.match(app, /\/currency\.js\?v=[A-Za-z0-9._-]+/);
});

test('landing and terms clearly state GBP worldwide', () => {
  assert.ok(index.includes('Prices and checkout are in GBP (£) worldwide.'));
  assert.match(index, /"priceCurrency":"GBP"/);
  assert.ok(terms.includes('subscription and credit checkout is charged in GBP (£) worldwide.'));
  assert.ok(!terms.includes('select a configured local Stripe price'));
});

test('Terms plan and top-up sections match GBP-only billing', () => {
  assert.ok(terms.includes('Plan prices and checkout are shown and charged in GBP (£) worldwide.'));
  assert.ok(terms.includes('top-up checkout is charged in GBP (£).'));
  assert.ok(!terms.includes('Where a local Stripe price has been configured'));
  assert.ok(!terms.includes('checkout displays a local currency'));
  assert.ok(!terms.includes('configured local-currency equivalent'));
});
