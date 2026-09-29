import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTodayActivation } from '../lib/funnel-metrics.js';

const landingHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appHtml = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const authJs = readFileSync(new URL('../api/auth.js', import.meta.url), 'utf8');

test('landing CTA can open first-run welcome', () => {
  assert.match(landingHtml, /\/app\?welcome=1/);
});

test('welcome entry opens the current actionable empty-chat composer', () => {
  assert.match(appHtml, /function welcomeHtml\(\)/);
  assert.match(appHtml, /No sign-in required to try Stellar/);
  assert.match(appHtml, /id="prompt"/);
  assert.match(appHtml, /prompt\.focus\(\)/);
});

test('signed-in and guest users share the same simple chat-first onboarding', () => {
  assert.match(appHtml, /signedInUser=store\(\)\.user\|\|null/);
  assert.match(appHtml, /await loadPlanTruth\(\)/);
  assert.match(appHtml, /loadSessions\(\)/);
  assert.doesNotMatch(appHtml, /tap a starter below/i);
});

test('password and Google signups send onboarding email', () => {
  assert.equal((authJs.match(/void sendWelcomeEmail\(/g) || []).length, 2);
  assert.match(authJs, /trystellarai\.com\/app\?welcome=1/);
});

test('same-day activation counts only today cohort and first generations', () => {
  const now = Date.parse('2026-08-27T15:00:00.000Z');
  const profiles = [
    { createdAt: Date.parse('2026-08-27T08:00:00.000Z'), funnel: { signupDay: '2026-08-27', firstGenerationAt: Date.parse('2026-08-27T08:10:00.000Z') } },
    { createdAt: Date.parse('2026-08-27T09:00:00.000Z'), funnel: { signupDay: '2026-08-27', firstGenerationAt: 0 } },
    { createdAt: Date.parse('2026-08-26T09:00:00.000Z'), funnel: { signupDay: '2026-08-26', firstGenerationAt: Date.parse('2026-08-27T10:00:00.000Z') } },
  ];
  assert.deepEqual(summarizeTodayActivation(profiles, now), { date: '2026-08-27', signups: 2, firstGenerations: 1, rate: 50 });
});
