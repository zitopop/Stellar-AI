import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage shows the real workspace tools instead of a sitemap-style whats-what block', () => {
  assert.match(home, /class="landing-tool-rail/);
  for (const label of ['Chat','Code + Debug','Files','Web','Voice','StellarX']) {
    assert.match(home, new RegExp('<strong>'+label.replace('+','\\+')+'<\\/strong>'));
  }
  assert.doesNotMatch(home, /class="home-whats-what"/);
  assert.doesNotMatch(home, /Know what each part is for\./);
});

test('homepage header has one link for each destination with no duplicate plan navigation', () => {
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  const plans = header.match(/href="\/plans">Plans<\/a>/g) || [];
  const business = header.match(/href="\/business">For Business<\/a>/g) || [];
  const signIn = header.match(/href="\/app\?signin=1">Sign in<\/a>/g) || [];
  assert.equal(plans.length, 1);
  assert.equal(business.length, 1);
  assert.equal(signIn.length, 1);
  assert.doesNotMatch(header, /id="mobile-nav"|id="nav-toggle"|class="nav-links"/);
});

test('homepage no longer hides the product behind the old chat-only compatibility contract', () => {
  assert.match(home, /data-hero-status>AI workspace<\/span>/);
  assert.doesNotMatch(home, /stellar-chatgpt-simple-home-v1/);
  assert.doesNotMatch(home, /main#main-content>section:not\(\.oa2-hero\):not\(\.home-whats-what\)\{display:none!important\}/);
  assert.match(home, /id="showcase"/);
  assert.match(home, /id="playground"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /id="business"/);
  assert.match(home, /faq-section/);
});
