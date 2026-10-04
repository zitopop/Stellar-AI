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

test('homepage has distinct desktop and mobile navigation without duplicate destinations in either', () => {
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
  const menus = [...header.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)];
  assert.equal(menus.length,2);
  for (const [,menu] of menus) {
    const destinations=[...menu.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(destinations.length,new Set(destinations).size);
    for(const required of ['#plans','/business','/app?signin=1']) assert.ok(destinations.includes(required));
  }
  assert.match(header,/aria-controls="mobile-nav"/);
  assert.match(header,/id="mobile-nav"[^>]*hidden/);
});

test('the product map accompanies the visible workspace and business sections', () => {
  assert.equal((home.match(/id="hero-title"/g)||[]).length,1);
  assert.match(home, /id="business"/);
  assert.match(home, /home-whats-what-grid/);
  assert.equal((home.match(/class="home-whats-what"/g)||[]).length,1);
});
