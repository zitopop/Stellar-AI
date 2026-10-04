import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage explains the main product areas once, in plain language', () => {
  assert.match(home, /class="home-whats-what"/);
  assert.match(home, /Know what each part is for\./);
  for (const label of ['Chat','Models','Plans','Business']) {
    assert.match(home, new RegExp('<strong>'+label+'<\\/strong>'));
  }
  assert.match(home, /files, images, web search, voice and StellarX live inside the app/);
  assert.match(home, /href="\/what-is-what">See the full what's-what guide/);
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

test('hero avoids repeating the brand and legacy landing sections stay hidden', () => {
  assert.match(home, /data-hero-status>AI workspace<\/span>/);
  assert.match(home, /main#main-content>section:not\(\.oa2-hero\)\{display:none!important\}/);
  assert.match(home, /id="business"/);
  assert.match(home, /home-whats-what-grid/);
  assert.match(home, /@media\(max-width:700px\)[\s\S]*home-whats-what-grid\{grid-template-columns:1fr\}/);
});
