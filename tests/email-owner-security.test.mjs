import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const getPlan = readFileSync(new URL('../api/get-plan.js', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../api/auth.js', import.meta.url), 'utf8');
const broadcast = readFileSync(new URL('../api/broadcast.js', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../lib/jarvis-voice.js', import.meta.url), 'utf8');
const emailConfig = readFileSync(new URL('../lib/email-config.js', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('privileged UI uses server-verified owner state rather than browser email matching', () => {
  assert.match(getPlan, /owner = isOwnerEmail\(session\.email\)/);
  assert.match(getPlan, /\n\s*owner,/);
  assert.match(app, /let serverOwner=false/);
  assert.match(app, /serverOwner=data\.owner===true/);
  assert.match(app, /function isOwner\(\)\{return serverOwner===true\}/);
  assert.match(app, /finally\{updateOwnerToolsVisibility\(\);renderPlanTruth\(\);updateModelLocks\(\);\}/);
  assert.doesNotMatch(app, /email==='deadlyfox10@gmail\.com'\|\|email==='tobi@trystellarai\.com'/);
});

test('all Resend mail paths require configured verified sender instead of Gmail From', () => {
  for (const source of [auth, broadcast, jarvis]) {
    assert.doesNotMatch(source, /from:\s*['"]Stellar AI <deadlyfox10@gmail\.com>/);
    assert.match(source, /resendSender/);
  }
  assert.match(emailConfig, /process\.env\.RESEND_FROM_EMAIL/);
  assert.match(readme, /RESEND_FROM_EMAIL/);
});

test('welcome email resend is restricted to the authenticated account', () => {
  assert.match(auth, /mode \|\| ''\) === 'send-welcome'/);
  assert.match(auth, /const session = readSession\(req\)/);
  assert.match(auth, /normalizedEmail !== session\.email/);
  assert.match(auth, /You can only send a welcome email to your signed-in account/);
});

test('welcome display names are HTML escaped before entering email markup', () => {
  assert.match(auth, /requestedName/);
  assert.match(auth, /const safeName = escapeEmailHtml\(displayName\)/);
  assert.match(emailConfig, /replace\(\/&\/g, '&amp;'\)/);
  assert.match(emailConfig, /replace\(\/<\/g, '&lt;'\)/);
});

test('auth endpoints throttle repeated login and signup attempts in shared KV', () => {
  assert.match(auth, /stellar:auth-rate:/);
  assert.match(auth, /\{ login: 10, signup: 6, googleLogin: 20, redeemCode: 10 \}/);
  assert.match(auth, /res\.status\(429\)/);
  assert.match(auth, /Retry-After/);
});

test('authenticated welcome email resends are rate-limited', () => {
  assert.match(auth, /stellar:welcome-email-rate:/);
  assert.match(auth, /rateCount > 1/);
  assert.match(auth, /res\.status\(429\)/);
});
