import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-landing-smart-v57.css', import.meta.url), 'utf8');

test('v57 removes the obsolete chat-only homepage contract', () => {
  assert.doesNotMatch(home, /stellar-chatgpt-simple-home-v1/);
  assert.doesNotMatch(home, /home-whats-what/);
  assert.doesNotMatch(home, /main#main-content>section:not\(\.oa2-hero\)/);
  assert.match(home, /stellar-landing-smart-v57\.css/);
});

test('v57 puts concrete tools directly after the hero', () => {
  const rail = home.match(/<section class="landing-tool-rail[\s\S]*?<\/section>/)?.[0] || '';
  for (const label of ['Chat','Code + Debug','Files','Web','Voice','StellarX']) {
    assert.match(rail, new RegExp('<strong>'+label.replace('+','\\+')+'<\\/strong>'));
  }
  assert.equal((rail.match(/<a /g) || []).length, 6);
});

test('v57 uses a benefit-led hero and two clear actions', () => {
  assert.match(home, /Prompt → code → error fix, without switching tools\./);
  assert.match(home, /Generate your first script/);
  assert.match(home, /See it in action/);
  assert.match(home, /class="stellar-showcase-cta"/);
});

test('v57 keeps the business toolkit visually separate from the developer product', () => {
  assert.match(home, /class="landing-business-divider/);
  assert.match(home, /DEVELOPER WORKSPACE/);
  assert.match(home, /SEPARATE BUSINESS TOOLKIT/);
  assert.match(home, /SEPARATE BUSINESS TOOLS/);
});

test('v57 keeps a compact responsive density system', () => {
  assert.match(css, /--stellar-gap:clamp\(56px,6vw,82px\)/);
  assert.match(css, /\.landing-tool-rail-grid/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
