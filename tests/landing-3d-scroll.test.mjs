import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('landing page has scroll-linked 3D product storytelling', () => {
  assert.match(home, /id="stellar-scroll-cinema-v1"/);
  assert.match(home, /data-scroll-cinema/);
  assert.match(home, /requestAnimationFrame\(render\)/);
  assert.match(home, /perspective\(1600px\)/);
  assert.match(home, /--scene-rx/);
  assert.match(home, /--hero-editor-rx/);
  assert.match(home, /--card-ry/);
});

test('major landing sections participate in the scroll scenes', () => {
  for (const selector of ['.oa2-hero','.dev-proof-strip','.stellar-dev-playground','.stellar-comparison','.stellar-trust-section','.pricing-section','.faq-section','.final-cta']) {
    assert.ok(home.includes("'" + selector + "'"), selector + ' should be registered as a scroll scene');
  }
});

test('desktop uses sticky product-story pauses while mobile stays lightweight', () => {
  assert.match(home, /@media\(min-width:980px\) and \(min-height:700px\)/);
  assert.match(home, /position:sticky!important;top:112px/);
  assert.match(home, /position:sticky;top:132px/);
  assert.match(home, /@media\(max-width:979px\)/);
  assert.match(home, /translate3d\(0,var\(--scene-y,0px\),0\)/);
});

test('scroll motion respects reduced-motion accessibility', () => {
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /scrollMotion='reduced'/);
  assert.match(home, /position:static!important/);
  assert.match(home, /stellar-scroll-ambient\{display:none!important\}/);
});

test('3D scroll layer stays dependency-free and progressive', () => {
  assert.doesNotMatch(home, /three\.js|gsap|ScrollTrigger/i);
  assert.match(home, /body\.dataset\.scrollCinema='on'/);
  assert.match(home, /addEventListener\('scroll',schedule,\{passive:true\}\)/);
  assert.match(home, /addEventListener\('resize',schedule,\{passive:true\}\)/);
});
