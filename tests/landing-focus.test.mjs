import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage keeps one clear primary action and secondary business navigation', () => {
  assert.match(home, /<h1 id="hero-title">Build &amp; fix<br><span>FiveM \+ Roblox scripts\.<\/span><\/h1>/);
  assert.match(home, /href="\/app\?welcome=1" class="oa2-primary-action">Try Stellar free/);
  assert.match(home, /href="#playground" class="oa2-secondary-action">See code demo<\/a>/);
  assert.doesNotMatch(home, /class="stellar-hero-paths"/);
  assert.match(home, /href="\/business">For Business<\/a>/);
});

test('homepage keeps the compact product map while hiding duplicate marketing sections', () => {
  assert.match(home, /class="home-whats-what"/);
  assert.match(home, /Know what each part is for\./);
  assert.match(home, /main#main-content>section:not\(\.oa2-hero\):not\(\.home-whats-what\)\{display:none!important\}/);
  assert.match(home, /id="business"/);
});

test('full product and business sections remain in source for direct routes and future use', () => {
  assert.match(home, /id="showcase"/);
  assert.match(home, /id="business"/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /faq-section/);
});
