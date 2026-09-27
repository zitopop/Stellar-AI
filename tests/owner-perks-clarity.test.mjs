import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');

test('owner perks are explained without exposing them to normal users', () => {
  assert.match(analytics, /stellar-owner-perks-polish-v1/);
  assert.match(analytics, /Owner perks explained/);
  assert.match(analytics, /Private tools stay hidden from normal users/);
  assert.match(analytics, /Jarvis/);
  assert.match(analytics, /Private owner command centre for missions, urgent calls and business decisions/);
  assert.match(analytics, /Computer/);
  assert.match(analytics, /StellarX computer access for approved desktop tasks/);
  assert.match(analytics, /Roblox Studio/);
  assert.match(analytics, /Owner-only building and script helper/);
  assert.match(analytics, /owner-only/);
});
