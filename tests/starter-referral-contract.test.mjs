import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getPlanDefinition, normalisePlan } from '../lib/pricing.js';

const profile = fs.readFileSync(new URL('../lib/profile.js', import.meta.url), 'utf8');
const getPlan = fs.readFileSync(new URL('../api/get-plan.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Starter remains a real server-side entitlement', () => {
  assert.equal(getPlanDefinition('starter').requestsPerHour, 120);
  assert.equal(getPlanDefinition('starter').maxTokens, 3500);
  assert.deepEqual(getPlanDefinition('starter').models, ['spark', 'star']);
  assert.equal(normalisePlan('lite'), 'plus');
});

test('referral and achievement data remain server-owned', () => {
  assert.match(profile, /stellar:referral:email:/);
  assert.match(profile, /REFERRAL_REWARD_PENCE = 100/);
  assert.match(profile, /referrerEmail === email/);
  assert.match(getPlan, /referralUrl/);
  assert.match(getPlan, /achievementDefinitions/);
});

test('workspace defaults to Star and has no removed skill-tree UI hooks', () => {
  assert.match(app, /Store\.get\('selectedModel','star'\)/);
  assert.doesNotMatch(app, /function renderSkillTree\(/);
  assert.doesNotMatch(app, /id="set-skill-tree/);
});
