import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTodayActivation } from '../lib/funnel-metrics.js';

const root = new URL('../', import.meta.url);
const landingHtml = readFileSync(join(root.pathname, 'index.html'), 'utf8');
const appHtml = readFileSync(join(root.pathname, 'app.html'), 'utf8');
const authJs = readFileSync(join(root.pathname, 'api/auth.js'), 'utf8');
const welcomeJs = readFileSync(join(root.pathname, 'api/send-welcome.js'), 'utf8');

test('hero free-generation CTA opens the app with the first-run welcome signal', () => {
  assert.match(landingHtml, /<a href="\/app\?welcome=1" class="button button-primary">Generate your first script free/);
});

test('welcome entry gives new visitors an actionable first-build message and removes its query flag', () => {
  assert.match(appHtml, /function applyWelcomeEntry\(\) \{/);
  assert.match(appHtml, /params\.get\('welcome'\) !== '1'/);
  assert.match(appHtml, /greeting\.textContent = 'Welcome to Stellar AI'/);
  assert.match(appHtml, /Tell me what you want to build, then review and test the files I create\./);
  assert.match(appHtml, /setGenerationStatus\('Welcome to Stellar AI\. Tell me what you want to build\.'\)/);
  assert.match(appHtml, /applyWelcomeEntry\(\);\s+maybeShowWelcome\(\);/);
});

test('first signed-in users see an unmistakable first-build instruction once per account', () => {
  assert.match(appHtml, /let firstSignIn = false;/);
  assert.match(appHtml, /firstSignIn = true;/);
  assert.match(appHtml, /function showFirstSignInOnboarding\(user\) \{/);
  assert.match(appHtml, /stellar-first-signin-onboarding-v1-/);
  assert.match(appHtml, /Type what you want to build — police job, drug system, heist — and Stellar will write the complete code\./);
  assert.match(appHtml, /Type a request<\/strong> or tap a starter below\./);
  assert.match(appHtml, /Or start with an example/);
  assert.match(appHtml, /Welcome\. Type what you want to build, or tap a starter example\./);
});

test('password and Google signups send a complete onboarding email', () => {
  assert.equal((authJs.match(/void sendWelcomeEmail\(/g) || []).length, 2);
  assert.match(authJs, /Stellar AI turns a plain-English game idea into a structured starting point for FiveM and Roblox/);
  assert.match(authJs, /Generate your first script/);
  assert.match(authJs, /Review the file list, dependencies and server-side checks/);
  assert.match(authJs, /https:\/\/trystellarai\.com\/app\?welcome=1/);
  assert.match(welcomeJs, /Stellar AI turns a plain-English game idea into a structured starting point for FiveM and Roblox/);
  assert.match(welcomeJs, /https:\/\/trystellarai\.com\/app\?welcome=1/);
});

test('same-day activation counts only today’s signup cohort and today’s first generations', () => {
  const now = Date.parse('2026-08-27T15:00:00.000Z');
  const profiles = [
    { createdAt: Date.parse('2026-08-27T08:00:00.000Z'), funnel: { signupDay: '2026-08-27', firstGenerationAt: Date.parse('2026-08-27T08:10:00.000Z') } },
    { createdAt: Date.parse('2026-08-27T09:00:00.000Z'), funnel: { signupDay: '2026-08-27', firstGenerationAt: 0 } },
    { createdAt: Date.parse('2026-08-26T09:00:00.000Z'), funnel: { signupDay: '2026-08-26', firstGenerationAt: Date.parse('2026-08-27T10:00:00.000Z') } },
  ];
  assert.deepEqual(summarizeTodayActivation(profiles, now), {
    date: '2026-08-27', signups: 2, firstGenerations: 1, rate: 50,
  });
});
