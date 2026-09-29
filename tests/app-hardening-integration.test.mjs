import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const auth = fs.readFileSync(new URL('../lib/auth.js', import.meta.url), 'utf8');
const telemetry = fs.readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');

test('workspace keeps signed-in state, server plan truth, and account-scoped local chat persistence', () => {
  assert.match(app, /localStorage\.getItem\('stellar-selected-model'\)/);
  assert.match(app, /planState/);
  assert.match(app, /loadPlanTruth\(\)/);
  assert.match(app, /stellar-chat-sessions:/);
  assert.match(app, /\/api\/get-plan/);
});

test('owner-only behaviour remains gated by server-authenticated account truth', () => {
  assert.match(auth, /isOwnerEmail/);
  assert.match(app, /serverOwner=data\.owner===true\|\|account\.owner===true/);
  assert.match(app, /function isOwner\(\)\{return serverOwner===true\}/);
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
});

test('legacy telemetry rescue functions remain available but are disabled on the clean app', () => {
  assert.match(telemetry, /stellar-business-polish-v8/);
  assert.match(telemetry, /function safeGetStorage/);
  assert.match(telemetry, /function rescueInteractionState/);
  assert.match(telemetry, /const cleanApp = document\.body\?\.dataset\?\.stellarCleanApp === 'true'/);
  assert.match(telemetry, /if \(!cleanApp\) \{/);
});

test('clean app owns its visible credit balance while telemetry never exposes owner credit controls', () => {
  assert.match(app, /id="creditPill"/);
  assert.match(app, /id="creditCount"/);
  assert.match(telemetry, /\[data-admin-credit\]/);
  assert.match(telemetry, /owner-credit-panel/);
});
