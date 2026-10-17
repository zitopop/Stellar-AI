import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authApi = readFileSync(new URL('../api/auth.js', import.meta.url), 'utf8');
const authLib = readFileSync(new URL('../lib/auth.js', import.meta.url), 'utf8');
const chatApi = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

test('auth exposes a safe session signing readiness check', () => {
  assert.match(authLib, /export function sessionSigningConfigured\(\)/);
  assert.match(authApi, /action === 'sessionHealth'/);
  assert.match(authApi, /req\.method === 'GET' && String\(req\.query\?\.mode \|\| ''\) === 'session-health'/);
  assert.match(authApi, /service: 'session-signing'/);
  assert.match(authApi, /status\(ready \? 200 : 503\)/);
});

test('missing signing configuration returns 503 instead of logging customers out', () => {
  assert.match(authLib, /export function requireSession\(req, res\) \{[\s\S]*?if \(presentedSession && !sessionSigningConfigured\(\)\) \{/);
  assert.match(authApi, /if \(action === 'refreshSession'\) \{[\s\S]*?if \(!sessionSigningConfigured\(\)\) \{/);
  assert.match(chatApi, /req\.headers\.authorization[\s\S]*?!sessionSigningConfigured\(\)/);
  assert.match(authLib, /status\(503\)\.json\(\{ error: 'Secure sign-in is temporarily unavailable\. Try again shortly\.', code: 'AUTH_SESSION_UNAVAILABLE' \}\)/);
});

test('auth does not expose the internal session secret name to users on config failure', () => {
  assert.match(authApi, /AUTH_SESSION_UNAVAILABLE/);
  assert.match(authApi, /Secure sign-in is temporarily unavailable\. Try again shortly\./);
  const userMessage = authApi.match(/error: 'Secure sign-in is temporarily unavailable\. Try again shortly\.'/)?.[0] || '';
  assert.doesNotMatch(userMessage, /AUTH_SESSION_SECRET/);
});
