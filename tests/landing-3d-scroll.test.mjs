import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('landing page keeps the current smart developer hero contract', () => {
  assert.match(home, /homepage-money-first-chat-2026-10-04/);
  assert.match(home, /premium-smart-v58/);
  assert.match(home, /<h1 id="hero-title">Build game scripts faster\.<br><span>Debug them before they ship\.<\/span><\/h1>/);
  assert.match(home, /placeholder="Describe a script or paste an error…"/);
  assert.match(home, /3 free previews · no signup · no card/);
  assert.match(home, /href="\/app\?welcome=1" class="oa2-primary-action">Start building free/);
});

test('landing keeps the developer preview and product sections in source behind the focused entry', () => {
  assert.match(home, /data-hero-editor/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="comparison"/);
  assert.match(home, /id="showcase"/);
  assert.match(home, /id="business"/);
  assert.match(home, /id="trust"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /faq-section/);
});

test('landing remains responsive and motion-accessible without heavy animation dependencies', () => {
  assert.match(home, /prefers-reduced-motion:reduce|prefers-reduced-motion: reduce/);
  assert.match(home, /@media\(max-width:390px\)/);
  assert.match(home, /premium-server-scene/);
  assert.match(home, /stellar-hero-server-v56\.css/);
  assert.match(home, /stellar-hero-server-v56\.js/);
  assert.doesNotMatch(home, /three\.js|gsap|ScrollTrigger/i);
});

test('smart redesign does not leave the removed scroll-cinema runtime active', () => {
  assert.doesNotMatch(home, /stellar-scroll-cinema-v1/);
  assert.doesNotMatch(home, /body\.dataset\.scrollCinema='on'/);
});
