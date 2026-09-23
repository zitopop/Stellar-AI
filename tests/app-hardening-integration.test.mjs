import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../lib/auth.js', import.meta.url), 'utf8');

test('workspace keeps signed-in state, server plan truth, and local chat persistence hooks', () => {
  assert.match(app, /Store\.get\('selectedModel','star'\)/);
  assert.match(app, /planState/);
  assert.match(app, /loadPlanTruth\(\)/);
  assert.match(app, /\/api\/get-chats/);
  assert.match(app, /\/api\/get-plan/);
});

test('owner-only behaviour remains gated by auth code and hidden UI class', () => {
  assert.match(auth, /isOwnerEmail/);
  assert.match(app, /owner-only/);
  assert.match(app, /deadlyfox10@gmail\.com|@stellar\.ai/);
});

