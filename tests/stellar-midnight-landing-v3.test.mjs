import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const midnight = readFileSync(new URL('../lib/assets/stellar-landing-midnight-v3.css', import.meta.url), 'utf8');

test('public landing uses final midnight stylesheet without purple or illuminated backgrounds', () => {
  assert.match(home, /stellar-landing-midnight-v3\.css\?v=20261011-1/);
  assert.ok(home.indexOf('stellar-landing-midnight-v3.css') > home.indexOf('stellar-midnight-20261011.css'));
  assert.match(midnight, /background:#090d15!important/);
  assert.match(midnight, /\.public-home \.hero\{/);
  assert.doesNotMatch(midnight, /#[0-9a-f]{0,2}(?:8a2be2|a855f7)|radial-gradient\(|linear-gradient\(/i);
});

test('landing has one product path, honest free tier and transparent subscription terms', () => {
  assert.match(home, /Think bigger\. Create faster\./);
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.match(home, /No card required/);
  assert.match(home, /15 Stellar Fast generations\/day/);
  assert.match(home, /Clear usage limits/);
  assert.match(home, /href="#plans">Compare plans/);
  for (const tier of ['free', 'starter', 'plus', 'pro']) assert.match(home, new RegExp('data-plan="' + tier + '"'));
  assert.match(home, /Yearly plans are billed upfront/);
  assert.match(home, /Illustrative examples · not a live chat/);
  assert.match(home, /id="anonymous-preview-form"/);
});

test('public landing removes unrelated businesses but keeps accessible core links', () => {
  assert.doesNotMatch(home, /Chrome Cruiser|Stellar Sloths Role Play/);
  assert.match(home, /href="\/business"/);
  assert.match(home, /href="\/terms"/);
  assert.match(home, /href="\/privacy"/);
  assert.match(home, /href="\/refunds"/);
  assert.match(home, /href="\/support"/);
  const ids = new Set([...home.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, anchor] of home.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(anchor), 'Missing #' + anchor);
  assert.match(midnight, /@media\(max-width:520px\)/);
  assert.match(midnight, /prefers-reduced-motion:reduce/);
});
