import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('landing page keeps the current chat-first hero contract', () => {
  assert.match(home, /homepage-chat-first-2026-10-04/);
  assert.match(home, /<h1 id="hero-title">Build faster\.<br><span>Think bigger\.<\/span><\/h1>/);
  assert.match(home, /placeholder="Message Stellar AI"/);
  assert.match(home, /Free to try · no card required/);
  assert.match(home, /href="\/app\?welcome=1" class="oa2-primary-action">Start free/);
});

test('landing keeps the developer preview and product sections behind the chat-first entry', () => {
  assert.match(home, /data-hero-editor/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="comparison"/);\n  assert.match(home, /id="showcase"/);\n  assert.match(home, /id="business"/);
  assert.match(home, /id="trust"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /faq-section/);
});

test('landing remains responsive and motion-accessible without heavy animation dependencies', () => {
  assert.match(home, /prefers-reduced-motion:reduce|prefers-reduced-motion: reduce/);
  assert.match(home, /@media\(max-width:390px\)/);
  assert.doesNotMatch(home, /three\.js|gsap|ScrollTrigger/i);
});

test('chat-first redesign does not leave the removed scroll-cinema runtime active', () => {
  assert.doesNotMatch(home, /stellar-scroll-cinema-v1/);
  assert.doesNotMatch(home, /body\.dataset\.scrollCinema='on'/);
});
