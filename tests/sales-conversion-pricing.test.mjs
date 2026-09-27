import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('homepage pricing stays concise and conversion-focused', () => {
  assert.match(index, /Start free\. Upgrade when Stellar becomes part of your day\./);
  assert.match(index, /Save 30% yearly/);
  assert.match(index, /Add-on credits stay separate/);
  assert.match(index, /Free is for trying Stellar\. Starter is for regular use\./);
  assert.doesNotMatch(index, /<div class="oa2-sales-ladder"/);
  assert.match(index, /class="plan-actions plan-actions-free"/);
  assert.match(index, /STELLAR CREDIT WALLET/);
  for (const pack of [300,500,1000,2500,5000,10000,20000]) assert.ok(index.includes('/app?credits=' + pack), String(pack));
  assert.match(app, /function openCreditWallet\(amount=0\)/);
  assert.match(app, /stellar-pending-credit-pack/);
});

test('Plus is positioned as the main paid conversion plan', () => {
  assert.match(index, /data-plan="plus"/);
  assert.match(index, /MOST POPULAR/);
  assert.match(index, /Deeper review \+ multi-file work/);
  assert.match(index, /3× FREE USAGE/);
  assert.match(index, /up to 250 Comet messages\/day/);
  assert.match(index, /up to 400 Nova messages\/day/);
  assert.match(index, /1,500 credits\/month/);
  assert.match(index, /5,000 credits\/month/);
  assert.match(index, /20,000 credits\/month/);
  assert.match(app, /Plus £20 · Comet/);
  assert.match(index, /both accounts receive 100 bonus Stellar Credits/);
});
