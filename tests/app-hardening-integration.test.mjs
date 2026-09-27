import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../lib/auth.js', import.meta.url), 'utf8');
const telemetry = fs.readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');

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

test('telemetry rescue layer keeps core app interactions recoverable', () => {
  assert.match(telemetry, /stellar-business-polish-v8/);
  assert.match(telemetry, /function safeGetStorage/);
  assert.match(telemetry, /function closeDrawer/);
  assert.match(telemetry, /rescueInteractionState/);
  assert.match(telemetry, /billing help/);
  assert.match(telemetry, /Pinned chats are protected/);
  assert.match(telemetry, /📌/u);
});

test('credits stay visible as a Manus-style sparkle token without exposing owner credit controls', () => {
  assert.match(telemetry, /stellar-credit-pill/);
  assert.match(telemetry, /ensureCreditIcon/);
  assert.match(telemetry, /sparkle-token/);
  assert.match(telemetry, /✦/u);
  assert.match(telemetry, /included allowance plus wallet top-ups/);
  assert.match(telemetry, /\[data-admin-credit\]/);
});

test('account settings show credits and mirror the visible credit value', () => {
  assert.match(telemetry, /stellar-account-credit-card/);
  assert.match(telemetry, /ensureAccountCreditCard/);
  assert.match(telemetry, /data-account-credit-value/);
  assert.match(telemetry, /Updates when your plan or wallet credits refresh/);
});
