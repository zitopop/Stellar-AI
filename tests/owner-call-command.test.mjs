import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
const ownerCall=readFileSync(new URL('../lib/owner-call.js',import.meta.url),'utf8');

test('Stellar exposes protected owner Jarvis call command',()=>{
  assert.match(app,/function ownerCallCommand\(text\)/);
  assert.match(app,/function triggerOwnerCall\(/);
  assert.match(app,/ownerRequest\('\/api\/broadcast',\{action:'callOwner'/);
  assert.match(app,/function checkOwnerCallHealth\(\)/);
  assert.match(app,/id="owner-call-now"[^>]*owner-only/);
  assert.match(app,/id="owner-call-health-btn"[^>]*owner-only/);
});

test('owner API handles call health verification and secure escalation',()=>{
  assert.match(broadcast,/action === 'verifyOwner'/);
  assert.match(broadcast,/action === 'callHealth'/);
  assert.match(broadcast,/action === 'callOwner'/);
  assert.match(broadcast,/action === 'escalateOwner'/);
  assert.match(broadcast,/internalEscalation/);
  assert.match(ownerCall,/ai-receptionist-live-chi\.vercel\.app\/api\/call-owner/);
  assert.match(broadcast,/requireSession\(req, res\)/);
  assert.match(broadcast,/isOwnerEmail\(session\.email\)/);
});
