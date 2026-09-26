import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('homepage pricing stays concise and conversion-focused', () => {
  assert.match(index, /Start free\. Upgrade when Stellar starts saving you time\./);
  assert.match(index, /Save 30% yearly/);
  assert.match(index, /Wallet credit stays separate/);
  assert.match(index, /Simple choice:/);
  assert.doesNotMatch(index, /<div class="oa2-sales-ladder"/);
  assert.match(index, /class="plan-actions plan-actions-free"/);
});

test('Plus is positioned as the main paid conversion plan', () => {
  assert.match(index, /data-plan="plus"/);
  assert.match(index, /MOST POPULAR/);
  assert.match(index, /RECOMMENDED/);
  assert.match(index, /Recommended for daily Stellar use/);
  assert.match(app, /Plus is recommended for daily work/);
  assert.match(app, /Plus £20 · Recommended/);
});
