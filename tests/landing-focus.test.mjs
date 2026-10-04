import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('hero routes visitors quickly by intent', () => {
  assert.match(home, /class="stellar-hero-paths"/);
  assert.match(home, /href="#playground"><span>BUILD<\/span><strong>Code &amp; debug<\/strong>/);
  assert.match(home, /href="#business"><span>GROW<\/span><strong>Business AI<\/strong>/);
  assert.match(home, /href="\/app\?welcome=1"><span>ASK<\/span><strong>Everyday work<\/strong>/);
});

test('landing narrative surfaces business earlier and moves taxonomy later', () => {
  const showcase = home.indexOf('id="showcase"');
  const business = home.indexOf('id="business"');
  const playground = home.indexOf('id="playground"');
  const plans = home.indexOf('id="plans"');
  const whats = home.indexOf('class="home-whats-what"');
  const faq = home.indexOf('class="section container faq-section"');
  assert.ok(showcase > 0 && business > showcase);
  assert.ok(playground > business);
  assert.ok(whats > plans);
  assert.ok(faq > whats);
});

test('final call to action represents the whole Stellar product', () => {
  assert.match(home, /START WITH STELLAR/);
  assert.match(home, /Bring the task/);
  assert.match(home, /Leave with something useful/);
  assert.match(home, /Explore Business AI/);
  assert.match(home, /Generated code should be tested in a development environment before production use/);
  assert.match(home, /Review other AI-generated output before relying on it/);
});
