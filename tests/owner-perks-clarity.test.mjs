import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('owner tools are gated in the app instead of injected by analytics', () => {
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
  assert.match(app, /Jarvis Briefings/);
  assert.match(app, /Call me now/);
  assert.match(app, /Deploy Center/);
  assert.match(app, /Roblox Studio/);
  assert.match(app, /Owner tools/);
  assert.doesNotMatch(analytics, /owner perks|stellar-owner-perks|Roblox Studio|Call me now/i);
});
