import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const refinements = readFileSync(new URL('../lib/assets/stellar-refinements.css', import.meta.url), 'utf8');
const homepageJs = readFileSync(new URL('../lib/assets/homepage.js', import.meta.url), 'utf8');

test('landing hero has one clear composer-led action path', () => {
  assert.match(landing, /AI systems for real business work\./);
  assert.match(landing, /Describe the task you want Stellar to help with/);
  assert.doesNotMatch(landing, /class="oa2-proof-row"/);
  assert.doesNotMatch(landing, /class="oa2-hero-actions"/);
  assert.doesNotMatch(landing, /class="oa2-starters"/);
  assert.doesNotMatch(landing, /class="oa2-quicklinks"/);
});

test('landing removes repetitive middle-page blocks', () => {
  assert.doesNotMatch(landing, /class="oa2-delivery container"/);
  assert.doesNotMatch(landing, /class="oa2-audience container"/);
  assert.doesNotMatch(landing, /aria-labelledby="updates-title"/);
  assert.doesNotMatch(landing, /class="oa2-section container oa2-business"/);
});

test('core product positioning leads with Stellar Workspace and keeps specialist agents available', () => {
  assert.match(landing, /<h2 id="feature-title">Stellar Workspace<\/h2>/);
  assert.match(landing, /Roblox Studio Agent/);
  assert.match(landing, /PC Agent/);
  assert.match(landing, /Connect the tools you use/);
});

test('landing navigation is focused on the main buying and product paths', () => {
  assert.match(landing, /Product[\s\S]*Business[\s\S]*Models[\s\S]*Pricing[\s\S]*Resources/);
  assert.doesNotMatch(landing, /<div class="nav-links">[\s\S]*?#agents/);
});

test('landing keeps a restrained responsive hero and tracks composer activation', () => {
  assert.match(refinements, /Landing focus pass/);
  assert.match(refinements, /font-size:clamp\(52px,7\.2vw,88px\)/);
  assert.match(refinements, /@media\(max-width:700px\)/);
  assert.match(homepageJs, /StellarTelemetry\?\.track\?\.\('app-open-cta'\)/);
});
