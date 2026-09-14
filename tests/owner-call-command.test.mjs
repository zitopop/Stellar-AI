import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const route = readFileSync(new URL('../api/call-owner.js', import.meta.url), 'utf8');
const verify = readFileSync(new URL('../api/verify-owner.js', import.meta.url), 'utf8');

test('Stellar exposes an owner-only Jarvis call command', () => {
  assert.match(app, /function ownerCallCommand\(text\)/);
  assert.match(app, /ownerRequest\('\/api\/call-owner'/);
  assert.match(app, /Owner access is required for phone calls/);
});

test('owner call route forwards only a verified Stellar session', () => {
  assert.match(route, /ai-receptionist-live-chi\.vercel\.app\/api\/call-owner/);
  assert.match(route, /requireSession\(req, res\)/);
  assert.match(route, /isOwnerEmail\(session\.email\)/);
  assert.match(route, /Authorization: authorization/);
  assert.doesNotMatch(route, /OWNER_PHONE|RETELL_API_KEY|CALL_BRIDGE_TOKEN/);
});

test('owner verifier reveals no secret data', () => {
  assert.match(verify, /requireSession\(req, res\)/);
  assert.match(verify, /isOwnerEmail\(session\.email\)/);
  assert.match(verify, /owner: true/);
});
