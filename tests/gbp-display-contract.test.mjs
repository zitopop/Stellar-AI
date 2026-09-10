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

test('landing and app bust stale currency script caches', () => {
  assert.match(index, /\/currency\.js\?v=gbp-20260910/);
  assert.match(app, /\/currency\.js\?v=gbp-20260910/);
});

test('landing and terms clearly state GBP worldwide', () => {
  assert.ok(index.includes('Prices and checkout are in GBP (£) worldwide.'));
  assert.ok(terms.includes('subscription and credit checkout is charged in GBP (£) worldwide.'));
  assert.ok(!terms.includes('select a configured local Stripe price'));
});
