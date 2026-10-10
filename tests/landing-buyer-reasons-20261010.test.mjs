import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('index.html');
const plans = read('plans.html');
const preview = read('lib/assets/homepage.js');
const examples = read('lib/assets/stellar-landing-demo-tabs-v1.js');

test('landing communicates useful outcomes without inventing reviews or guarantees', () => {
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.match(home, /Turn ideas into work you can use\./);
  assert.match(home, /Try Stellar free/);
  assert.match(home, /Start with a task, not a blank page/);
  assert.doesNotMatch(home, /trusted by \d+|guaranteed bug-free|rated 5 stars/i);
});

test('pricing is transparent, visible and leads to the existing checkout flow', () => {
  for (const slug of ['free', 'starter', 'plus', 'pro']) {
    assert.ok(home.includes('data-plan="' + slug + '"'), slug);
  }
  for (const price of ['£0', '£8', '£20', '£75', '£67', '£168', '£630']) {
    assert.ok(home.includes(price), price);
  }
  assert.match(home, /7,500 Fast-equivalent generations\/month/);
  assert.match(home, /shared Fast-equivalent allowance, not unlimited messages/);
  assert.match(home, /data-conversion="plus"/);
  for (const slug of ['starter','plus','pro']) {
    assert.ok(home.includes('href="/app?upgrade=' + slug + '&amp;utm_source=homepage'), slug);
  }
  assert.match(plans, /Fast-equivalent/);
});

test('illustrative task tabs are accessible and open real editable app prompts', () => {
  assert.equal((home.match(/data-example-tab="/g) || []).length, 3);
  assert.match(home, /role="tablist"/);
  assert.match(home, /role="tabpanel"/);
  assert.match(home, /Illustrative examples · not a live chat/);
  assert.match(home, /id="stellar-example-try"/);
  assert.match(examples, /ArrowLeft/);
  assert.match(examples, /ArrowRight/);
  assert.match(examples, /aria-selected/);
  assert.match(examples, /URLSearchParams/);
  assert.match(examples, /\/app\?/);
});

test('real code preview remains interactive and requires an explicit submit', () => {
  assert.match(home, /id="anonymous-preview-form"/);
  assert.match(home, /id="anonymous-preview-prompt"/);
  assert.equal((home.match(/data-preview-prompt="/g) || []).length, 3);
  assert.match(preview, /wireAnonymousPreview\(\)/);
  assert.match(preview, /fetch\('\/api\/preview'/);
  assert.match(preview, /form\.addEventListener\('submit'/);
});

test('shorter page retains clear navigation, help, and legal policies', () => {
  assert.doesNotMatch(home, /id="compare-free-plus"|id="why-trust"/);
  for (const id of ['example-showcase','work-tasks','plans','try-preview','faq']) {
    assert.ok(home.includes('id="' + id + '"'), id);
  }
  for (const link of ['/support','/terms','/privacy','/refunds','/plans']) {
    assert.ok(home.includes('href="' + link + '"'), link);
  }
  assert.match(home, /data-conversion="start-free"/);
  assert.match(home, /class="menu-toggle"/);
});
