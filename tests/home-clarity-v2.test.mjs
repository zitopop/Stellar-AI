import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-landing-clean-v1.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('../lib/assets/stellar-home-clarity-v1.css', import.meta.url), 'utf8');

test('public home has one clear headline, no repetitive sections and working destinations', () => {
  assert.match(home, /<h1 id="hero-title">Build and debug FiveM &amp; Roblox scripts\.<\/h1>/);
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(home, /id="how-it-works"|id="bottom-title"/);
  const ids = [...home.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, hash] of home.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(hash), 'anchor #' + hash);
  for (const path of ['/install','/server-pass','/script-fix','/free-tools','/plans','/terms','/privacy','/refunds','/support']) {
    assert.ok(home.includes('href="' + path + '"'), path);
  }
});

test('price switch, preview and transparent terms remain discoverable', () => {
  assert.match(home, /id="anonymous-preview-form"/);
  assert.match(home, /data-cycle="annual"/);
  assert.match(home, /data-cycle="monthly"/);
  for (const key of ['starter','plus','pro']) assert.match(home, new RegExp('data-plan="' + key + '"'));
  assert.match(home, /Yearly plans are billed upfront/);
  assert.match(home, /Generated code should be tested in a development environment before production use/);
});

test('separate cacheable styles and app essentials are retained', () => {
  assert.match(home, /stellar-landing-clean-v1\.css/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(app, /stellar-home-clarity-v1\.css/);
  assert.match(app, /id="newChatBtn"/);
  assert.match(app, /id="chatForm"/);
  assert.match(app, /data-composer-mode="general"/);
  assert.match(app, /data-composer-mode="debug"/);
  assert.match(appCss, /#prompt/);
  assert.match(appCss, /font-size:16px!important/);
});
