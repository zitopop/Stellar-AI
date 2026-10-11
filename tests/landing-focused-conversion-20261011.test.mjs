import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('index.html');
const css = read('lib/assets/stellar-landing-quiet-midnight-v1.css');
const promptScript = read('lib/assets/stellar-hero-prompt-v1.js');

test('marketing homepage offers three accessible example prompts with editable handoff', () => {
  const examples = [...home.matchAll(new RegExp('<a class="hero-prompt-chip" href="([^"]+)" data-hero-prompt="([^"]+)" data-hero-mode="([^"]+)">([^<]+)</a>', 'g'))];
  assert.equal(examples.length, 3);
  assert.deepEqual(examples.map(example => example[4]), ['Write something','Plan a project','Fix my code']);
  for (const [, href, prompt, mode] of examples) {
    assert.ok(prompt.length > 30);
    const parsed = new URL(href.replaceAll('&amp;', '&'), 'https://trystellarai.com');
    assert.equal(parsed.pathname, '/app');
    assert.equal(parsed.searchParams.get('prompt'), prompt);
    assert.equal(parsed.searchParams.get('mode'), mode);
    assert.equal(parsed.searchParams.get('utm_source'), 'homepage');
  }
  assert.match(home, /role="group" aria-label="Quick prompts"/);
  assert.match(home, /Opens as an editable draft/);
  assert.match(promptScript, /data-hero-prompt/);
  assert.match(promptScript, /event\.preventDefault\(\)/);
  assert.match(promptScript, /input\.value = example/);
});

test('all four paid and free plans are visible without an expansion menu', () => {
  const main = home.match(/<div class="pricing-grid pricing-grid-primary" aria-label="Stellar AI subscriptions">([\s\S]*?)<\/div>\s*<p class="plan-full-link">/);
  assert.ok(main, 'all plans belong to one visible comparison grid');
  const displayed = [...main[1].matchAll(/data-plan="(free|starter|plus|pro)"/g)].map(match => match[1]);
  assert.deepEqual(displayed, ['free', 'starter', 'plus', 'pro']);
  assert.doesNotMatch(home, /<details class="additional-plans">/);
  assert.match(home, /href="#plans" aria-label="Compare Free, Starter, Plus and Pro plans"/);
  assert.match(home, /href="\/plans"/);
  assert.match(home, /data-cycle="annual"/);
  assert.match(home, /Yearly plans are billed upfront/);
});

test('Midnight overrides keep two-column desktop pricing and one-column phone cards', () => {
  assert.match(css, /\.pricing-grid-primary/);
  assert.match(css, /\.pricing-grid-secondary/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /grid-template-columns:1fr!important/);
  assert.doesNotMatch(css, /radial-gradient|#8b5cf6|#a78bfa/i);
  assert.doesNotMatch(home, /trusted by \d+|guaranteed bug-free|5-star reviews/i);
});
