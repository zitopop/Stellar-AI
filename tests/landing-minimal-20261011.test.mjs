import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
const html = read('index.html');
const css = read('lib/assets/stellar-homepage-minimal-20261011.css');

test('public landing has five purposeful sections and no irrelevant product promotions',()=>{
  const sections=[...html.matchAll(/<section\b[^>]*>/g)].map(m=>m[0]);
  assert.equal(sections.length,5,'one hero, use cases, pricing, optional code tool, FAQ');
  for(const id of ['hero-title','example-showcase','work-tasks','plans','try-preview','faq']) {
    assert.ok(html.includes('id="'+id+'"'),'missing '+id);
  }
  for(const obsolete of ['id="jarvis"','id="stellar-models"','id="ventures"','id="extras"','id="start-title"','class="script-fix-promo"']) {
    assert.ok(!html.includes(obsolete),'obsolete clutter: '+obsolete);
  }
  assert.ok(html.length<25000,'landing markup should remain compact');
});

test('main navigation and pricing remain reachable and transparent',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  assert.equal(ids.size,[...html.matchAll(/\bid="([^"]+)"/g)].length,'unique IDs');
  for(const [,hash] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(hash),'broken link #'+hash);
  for(const plan of ['free','starter','plus','pro'])assert.match(html,new RegExp('data-plan="'+plan+'"'));
  for(const route of ['/app?welcome=1','/app?signin=1','/plans','/terms','/privacy','/refunds','/support']){
    assert.ok(html.includes('href="'+route),'missing '+route);
  }
  assert.match(html,/data-cycle="annual"/);
  assert.match(html,/Yearly plans are billed upfront/);
});

test('code preview stays functional but optional, including incoming direct links',()=>{
  assert.match(html,/<details class="developer-preview-collapse">/);
  for(const id of ['anonymous-preview-form','anonymous-preview-prompt','anonymous-preview-submit','anonymous-preview-result','anonymous-preview-download'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(html,/location\.hash === '#try-preview'/);
  assert.match(html,/addEventListener\('hashchange', showLinkedPreview\)/);
});

test('Midnight home has no purple glows and mobile accessibility stays intact',()=>{
  assert.match(html,/stellar-homepage-minimal-20261011\.css/);
  assert.match(css,/\.public-home::before,\.public-home::after\{display:none!important/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css,/#8b5cf6|#a78bfa|radial-gradient|#9881ff/i);
});
