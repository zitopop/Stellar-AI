import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('index.html');
const css = read('lib/assets/stellar-landing-quiet-midnight-v1.css');
const promptScript = read('lib/assets/stellar-hero-prompt-v1.js');

test('marketing homepage offers three accessible example prompts with editable handoff', () => {
  const examples = [...home.matchAll(/<a class="hero-prompt-chip" href="([^"]+)" data-hero-prompt="([^"]+)" data-hero-mode="([^"]+)">([^<]+)<\\/a>/g)];
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

test('Free and Plus appear first while Starter and Pro remain reachable', () => {
  const main = home.match(/<div class="pricing-grid pricing-grid-primary">([\s\S]*?)<\/div>\s*<details class="additional-plans">/);
  assert.ok(main);
  assert.match(main[1], /data-plan="free"/);
  assert.match(main[1], /data-plan="plus"/);
  assert.doesNotMatch(main[1], /data-plan="starter"|data-plan="pro"/);
  const compare = home.match(/<details class="additional-plans">([\s\S]*?)<\/details>/);
  assert.ok(compare);
  assert.match(compare[1], /<summary>Compare Starter and Pro plans/);
  for (const p of ['starter', 'pro']) assert.ok(compare[1].includes('data-plan="' + p + '"'));
  for (const p of ['free', 'starter', 'plus', 'pro']) assert.equal((home.match(new RegExp('data-plan="' + p + '"','g')) || []).length, 1);
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
