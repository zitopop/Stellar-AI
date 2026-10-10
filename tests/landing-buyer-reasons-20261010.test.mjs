import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../lib/assets/homepage.js', import.meta.url), 'utf8');

test('landing sells real outcomes without inventing reviews or guarantees', () => {
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.match(home, /Get useful work done with AI\./);
  assert.match(home, /Don’t just ask AI questions/);
  assert.match(home, /Try Stellar free/);
  assert.match(home, /Less busywork\. More progress/);
  assert.match(home, /Try it\. Check the limits\. Then decide\./);
  assert.doesNotMatch(home, /trusted by \d+|guaranteed bug-free|rated 5 stars/i);
});

test('buyers can compare truthful Free and Plus entitlements and follow checkout links', () => {
  assert.match(home, /id="compare-free-plus"/);
  assert.match(home, /<table class="buyer-table">/);
  for (const term of ['Up to 15 Fast generations/day','Up to 7,500 Fast-equivalent generations/month','Stellar Fast, Core and Deep','400 requests\/hour','£20\/mo']) assert.ok(home.includes(term), term);
  assert.match(home, /href="\/app\?upgrade=plus&amp;utm_source=homepage&amp;utm_campaign=free-vs-plus"/);
  assert.match(home, /Core and Deep consume more allowance per generation/);
  for (const slug of ['free','starter','plus','pro']) assert.ok(home.includes('data-plan="' + slug + '"'));
});

test('live preview examples fill the real form without submitting or consuming credits', () => {
  assert.match(home, /id="anonymous-preview-form"/);
  assert.match(home, /id="anonymous-preview-prompt"/);
  assert.equal((home.match(/data-preview-prompt="/g)||[]).length, 3);
  assert.match(runtime, /\$\$\('\[data-preview-prompt\]'\)/);
  assert.match(runtime, /input\.value = example/);
  assert.match(runtime, /input\.focus\(\{ preventScroll: true \}\)/);
  const begin = runtime.indexOf("$$('[data-preview-prompt]')");
  const end = runtime.indexOf("form.addEventListener('submit'", begin);
  assert.ok(end > begin);
  assert.doesNotMatch(runtime.slice(begin, end), /fetch\(|\.submit\(|requestSubmit\(/);
  assert.match(runtime, /fetch\('\/api\/preview'/);
});

test('trust and navigation offer real help, refund and privacy paths', () => {
  assert.match(home, /id="why-trust"/);
  for (const link of ['/support','/terms','/privacy','/refunds','/plans']) assert.ok(home.includes('href="' + link + '"'), link);
  assert.match(home, /data-conversion="start-free"/);
  assert.match(home, /data-conversion="plus"/);
  assert.match(home, /@media\(max-width:760px\)/);
  assert.match(home, /aria-label="Example coding prompts"/);
});

test('full pricing page reinforces clear paid value without altering price points', () => {
  assert.match(plans, /Pay for more progress, not more clutter\./);
  assert.match(plans, /For daily work: more capacity, Stellar Deep/);
  for (const price of ['£0','£8','£20','£75','£67','£168','£630']) assert.ok(plans.includes(price), price);
  for (const slug of ['starter','plus','pro']) assert.ok(plans.includes('href="/app?upgrade=' + slug + '"'), slug);
});
