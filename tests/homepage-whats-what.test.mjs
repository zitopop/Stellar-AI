import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage shows real workspace tools instead of a sitemap-style whats-what block', () => {
  assert.match(home, /class="landing-tool-rail/);
  for (const label of ['Chat','Code + Debug','Files','Web','Voice','StellarX']) {
    assert.match(home, new RegExp('<strong>'+label.replace('+','\\+')+'<\\/strong>'));
  }
  assert.doesNotMatch(home, /class="home-whats-what"/);
  assert.doesNotMatch(home, /Know what each part is for\./);
});

test('homepage header keeps one clear link for each main destination', () => {
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  assert.equal((header.match(/href="\/plans">Plans<\/a>/g) || []).length, 1);
  assert.equal((header.match(/href="\/business">Business<\/a>/g) || []).length, 1);
  assert.equal((header.match(/href="\/app\?signin=1">Sign in<\/a>/g) || []).length, 1);
});

test('homepage no longer hides the premium product sections', () => {
  assert.doesNotMatch(home, /stellar-chatgpt-simple-home-v1/);
  assert.doesNotMatch(home, /main#main-content>section:not\(\.oa2-hero\):not\(\.home-whats-what\)\{display:none!important\}/);
  for (const id of ['showcase','playground','plans','business']) assert.match(home, new RegExp('id="'+id+'"'));
  assert.match(home, /faq-section/);
});