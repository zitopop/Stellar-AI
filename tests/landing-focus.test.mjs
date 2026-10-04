import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage provides one free primary hero action and clear business navigation', () => {
  const hero=home.match(/<section class="oa2-hero[\s\S]*?<\/section>/)?.[0]||'';
  assert.equal((hero.match(/class="button button-primary"/g)||[]).length,1);
  assert.match(hero,/href="\/app\?welcome=1"/);
  assert.doesNotMatch(home, /class="stellar-hero-paths"/);
  assert.match(home, /href="\/business">For business<\/a>/i);
});

test('homepage keeps the product map with visible product and business sections', () => {
  assert.match(home, /class="home-whats-what"/);
  assert.match(home, /Know what each part is for\./);
  assert.match(home,/id="showcase"/);
  assert.match(home, /id="business"/);
});

test('full product and business sections remain in source for direct routes and future use', () => {
  assert.match(home, /id="showcase"/);
  assert.match(home, /id="business"/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /faq-section/);
});
