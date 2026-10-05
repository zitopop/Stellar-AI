import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-landing-premium-v53.css', import.meta.url), 'utf8');

test('premium landing v53 uses a concrete hero and one clear conversion path', () => {
  assert.match(home, /Build\. Debug\. Ship\.<br><span>FiveM \+ Roblox scripts\.<\/span>/);
  assert.match(home, /Generate secure QBCore, ESX, ox_lib and Roblox Luau/);
  assert.match(home, /Try 3 code previews free · no card required/);
  assert.match(home, /class="oa2-primary-action">Try Stellar free/);
  assert.match(home, /class="oa2-secondary-action">See code demo/);
  assert.match(home, /stellar-landing-premium-v53\.css/);
});

test('premium proof strip uses product facts instead of unverifiable social proof', () => {
  for (const phrase of ['Free</span> to start','4</span> framework targets','Debug</span> broken code','.lua</span> export']) {
    assert.match(home, new RegExp(phrase.replace('.', '\\.')));
  }
  const proof = home.match(/<section class="dev-proof-strip[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(proof, /data-discord-members|online now|community/i);
});

test('business bridge prioritizes three paid offers and keeps secondary workflows compact', () => {
  const business = home.match(/<section class="stellar-business-entry[\s\S]*?<\/section>/)?.[0] || '';
  const cards = business.match(/class="stellar-business-entry-card"/g) || [];
  assert.equal(cards.length, 3);
  assert.match(business, /Website Audit \/ Quick Fix/);
  assert.match(business, /AI Business Website/);
  assert.match(business, /AI Receptionist/);
  assert.match(business, /Inbox Closer/);
  assert.match(business, /Open Guided Sales Mode/);
});

test('landing pricing presents monthly choices first', () => {
  assert.match(css, /\.public-home \.plan \.annual,[\s\S]*\.plan-yearly-link[\s\S]*display:none!important/);
  assert.match(home, /Paid plans add more usage and deeper Stellar capability when you actually need it/);
  assert.match(home, /MOST POPULAR/);
});

test('landing stays responsive without heavy animation libraries', () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(home + css, /three\.js|gsap|ScrollTrigger/i);
});
