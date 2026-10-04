import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authApi = readFileSync(new URL('../api/auth.js', import.meta.url), 'utf8');
const authLib = readFileSync(new URL('../lib/auth.js', import.meta.url), 'utf8');

test('auth exposes a safe session signing readiness check', () => {
  assert.match(authLib, /export function sessionSigningConfigured\(\)/);
  assert.match(authApi, /action === 'sessionHealth'/);
  assert.match(authApi, /req\.method === 'GET' && String\(req\.query\?\.mode \|\| ''\) === 'session-health'/);
  assert.match(authApi, /service: 'session-signing'/);
  assert.match(authApi, /status\(ready \? 200 : 503\)/);
});

test('auth does not expose the internal session secret name to users on config failure', () => {
  assert.match(authApi, /AUTH_SESSION_UNAVAILABLE/);
  assert.match(authApi, /Secure sign-in is temporarily unavailable\. Try again shortly\./);
  const userMessage = authApi.match(/error: 'Secure sign-in is temporarily unavailable\. Try again shortly\.'/)?.[0] || '';
  assert.doesNotMatch(userMessage, /AUTH_SESSION_SECRET/);
});
