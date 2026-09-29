import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage polish keeps the public landing page clean and conversion-focused', () => {
  assert.match(landing, /public-home/);
  assert.match(analytics, /stellar-public-conversion-polish-v4/);
  assert.match(analytics, /polishHomepageContent/);
  assert.match(analytics, /Your AI workspace\./);
  assert.match(analytics, /Start free/);
  assert.match(analytics, /Free to start · \d[\d,]* credits\/day · resets at midnight UK time/);
});

test('homepage value strip is compact and mobile-safe', () => {
  assert.match(analytics, /stellar-home-focus/);
  assert.match(analytics, /Chat that gets work done/);
  assert.match(analytics, /Website and business help/);
  assert.match(analytics, /Credits that feel clear/);
  assert.match(analytics, /@media\(max-width:760px\)/);
  assert.match(analytics, /overflow:auto!important/);
});
