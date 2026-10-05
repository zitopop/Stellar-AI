import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage keeps one clear primary action and secondary workflow navigation', () => {
  assert.match(home, /<h1 id="hero-title">Build game scripts faster\.<br><span>Debug them before they ship\.<\/span><\/h1>/);
  assert.match(home, /href="\/app\?welcome=1" class="oa2-primary-action">Start building free/);
  assert.match(home, /href="#playground" class="oa2-secondary-action">See the workflow<\/a>/);
  assert.doesNotMatch(home, /class="stellar-hero-paths"/);
  assert.match(home, /href="\/business">For Business<\/a>/);
});

test('homepage suppresses duplicate marketing sections while keeping the useful flow visible', () => {
  assert.match(home, /id="stellar-smart-home-v58"/);
  assert.match(home, /\.public-home \.landing-trust-panel,/);
  assert.match(home, /\.public-home \.home-whats-what,/);
  assert.match(home, /\.public-home \.stellar-debug-proof\{display:none!important\}/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /id="business"/);
});

test('full product and business sections remain in source for direct routes and future use', () => {
  assert.match(home, /id="showcase"/);
  assert.match(home, /id="business"/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /faq-section/);
});
