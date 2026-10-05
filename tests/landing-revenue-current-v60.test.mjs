import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('current landing page has one clear developer revenue path', () => {
  assert.match(home, /homepage-revenue-funnel-2026-10-05/);
  assert.match(home, /Build, debug and ship FiveM &amp; Roblox scripts faster\./);
  assert.match(home, /Start building free/);
  assert.match(home, /See Plus · £20\/mo/);
  assert.match(home, /Priority Script Fix · £99/);
  assert.match(home, /Get Plus · £20\/mo/);
});

test('homepage preserves try-before-pay and framework proof', () => {
  assert.match(home, /3 instant previews/);
  assert.match(home, /Free · up to 15 Fast\/day/);
  for (const name of ['QBCore','ESX','ox_lib','Luau']) assert.match(home, new RegExp(name));
  assert.match(home, /anonymous-preview-form/);
});

test('homepage emits conversion signals instead of relying on guesswork', () => {
  assert.match(home, /data-conversion="start-free"/);
  assert.match(home, /data-conversion="plus"/);
  assert.match(home, /data-conversion="script-fix"/);
  assert.match(home, /telemetry\.js\?v=20261005-revenue-funnel/);
  assert.match(home, /homepage\.js\?v=20261005-revenue-funnel/);
});
