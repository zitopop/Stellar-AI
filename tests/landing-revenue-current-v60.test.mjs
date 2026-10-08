import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../lib/assets/homepage.js', import.meta.url), 'utf8');

test('landing is lean, focused and honest about capabilities', () => {
  assert.match(home, /Build and debug FiveM &amp; Roblox scripts\./);
  assert.match(home, /FiveM and Roblox creators/);
  assert.match(home, /QBCore · ESX · ox_lib · Luau/);
  assert.match(home, /Generated code should be tested in a development environment before production use/i);
  assert.match(home, /no card needed/i);
  assert.doesNotMatch(home, /guaranteed bug-free|trusted by \d+|most popular choice/i);
  assert.ok(home.length < 80_000, 'homepage should no longer include hundreds of KB of legacy styles');
});

test('anonymous preview is usable and keeps its anti-abuse script', () => {
  for (const id of ['anonymous-preview-form','anonymous-preview-prompt','anonymous-preview-submit','anonymous-preview-status','anonymous-preview-result','anonymous-preview-code','anonymous-preview-download']) {
    assert.match(home, new RegExp('id="' + id + '"'));
  }
  assert.match(home, /homepage\.js\?v=20261008-clean/);
  assert.match(preview, /wireAnonymousPreview\(\)/);
  assert.match(preview, /fetch\('\/api\/preview'/);
  assert.match(preview, /ANON_COUNT_TIME_KEY/);
  assert.match(preview, /dataset\.layout !== 'lean-v1'/);
});

test('pricing and billing links support all four plans', () => {
  for (const plan of ['free','starter','plus','pro']) assert.match(home, new RegExp('data-plan="' + plan + '"'));
  for (const price of ['£8','£20','£75','£67','£168','£630']) assert.ok(home.includes(price), price);
  assert.match(home, /data-cycle="annual"/);
  for (const slug of ['starter-annual','plus-annual','pro-annual']) assert.match(home, new RegExp(slug));
  assert.match(home, /data-conversion="start-free"/);
  assert.match(home, /data-conversion="plus"/);
  assert.match(home, /telemetry\.js\?v=20261005-revenue-funnel/);
});

test('nav, mobile controls, contact and legal links are preserved', () => {
  assert.match(home, /class="menu-toggle"/);
  assert.match(home, /aria-expanded="false"/);
  assert.match(home, /deadlyfox10@gmail\.com/);
  for (const path of ['/plans','/terms','/privacy','/refunds','/support','/business','/install','/server-pass','/script-fix']) {
    assert.match(home, new RegExp('href="' + path + '"'));
  }
});
