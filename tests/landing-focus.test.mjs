import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage keeps one clear primary action and secondary business navigation', () => {
  assert.match(home, /<h1 id="hero-title">Build &amp; fix<br><span>FiveM \+ Roblox scripts\.<\/span><\/h1>/);
  assert.match(home, /href="\/app\?welcome=1" class="oa2-primary-action">Generate your first script/);
  assert.match(home, /href="#playground" class="oa2-secondary-action">See it in action<\/a>/);
  assert.doesNotMatch(home, /class="stellar-hero-paths"/);
  assert.match(home, /href="\/business">For Business<\/a>/);
});

test('homepage puts concrete tools near the hero and keeps the full product visible', () => {
  assert.match(home, /class="landing-tool-rail/);
  assert.match(home, /Prompt → code → error fix, without switching tools\./);
  assert.match(home, /class="stellar-showcase-cta"/);
  assert.doesNotMatch(home, /class="home-whats-what"/);
  assert.doesNotMatch(home, /main#main-content>section:not\(\.oa2-hero\)/);
});

test('full product and business sections remain in source and business stays separate', () => {
  assert.match(home, /id="showcase"/);
  assert.match(home, /id="business"/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /faq-section/);
  assert.match(home, /class="landing-business-divider/);
});
