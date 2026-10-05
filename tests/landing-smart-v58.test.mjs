import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-landing-structure-v58.css', import.meta.url), 'utf8');

test('v58 removes the obsolete chat-only homepage contract', () => {
  assert.doesNotMatch(home, /stellar-chatgpt-simple-home-v1/);
  assert.doesNotMatch(home, /home-whats-what/);
  assert.doesNotMatch(home, /main#main-content>section:not\(\.oa2-hero\)/);
  assert.match(home, /stellar-landing-structure-v58\.css/);
});

test('v58 exposes concrete tools directly after the hero', () => {
  const rail = home.match(/<section class="landing-tool-rail[\s\S]*?<\/section>/)?.[0] || '';
  for (const label of ['Chat','Code + Debug','Files','Web','Voice','StellarX']) {
    assert.match(rail, new RegExp('<strong>'+label.replace('+','\\+')+'<\\/strong>'));
  }
  assert.equal((rail.match(/<a /g) || []).length, 6);
});

test('v58 keeps one clear hero and removes internal-looking business numbering', () => {
  assert.match(home, /Write, debug and export FiveM \+ Roblox scripts from one focused workspace/);
  assert.match(home, /Start coding free/);
  assert.match(home, /See it in action/);
  assert.doesNotMatch(home, /0[123] · (?:CONVERSION|WEBSITE|RECEPTIONIST)/);
  assert.match(home, /class="landing-business-divider/);
});

test('v58 stays compact and responsive', () => {
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
