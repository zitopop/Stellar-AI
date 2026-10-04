import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage explains what each main product area is for without reintroducing marketing clutter', () => {
  assert.match(home, /class="home-whats-what"/);
  assert.match(home, /Know what each part is for\./);
  for (const label of ['Chat','Models','Plans','Tools']) {
    assert.match(home, new RegExp('<strong>'+label+'<\\/strong>'));
  }
  assert.match(home, /href="\/what-is-what">See the full what's-what guide/);
});

test('homepage header keeps one Plans link and avoids repeating the brand in the hero status', () => {
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  const planLinks = header.match(/href="\/plans">Plans<\/a>/g) || [];
  assert.equal(planLinks.length, 1);
  assert.match(home, /data-hero-status>AI workspace<\/span>/);
  assert.doesNotMatch(header, /id="mobile-nav"|id="nav-toggle"/);
});

test('simple homepage still hides legacy product sections rather than duplicating their content', () => {
  assert.match(home, /main#main-content>section:not\(\.oa2-hero\)\{display:none!important\}/);
  assert.match(home, /home-whats-what-grid/);
  assert.match(home, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(home, /@media\(max-width:700px\)[\s\S]*home-whats-what-grid\{grid-template-columns:1fr\}/);
});
