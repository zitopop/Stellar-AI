import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
const ownerCall=readFileSync(new URL('../lib/owner-call.js',import.meta.url),'utf8');
test('Stellar exposes owner Jarvis call command',()=>{assert.match(app,/function ownerCallCommand\(text\)/);assert.ok(app.includes('(?:hey\\s+)?jarvis'));assert.ok(app.includes('call me(?:\\s*[,\\-:]?\\s*jarvis)?'));assert.match(app,/ownerRequest\('\/api\/broadcast', \{ action: 'callOwner', purpose \}\)/);assert.match(app,/function checkOwnerCallHealth\(\)/);assert.match(app,/Test call me now/);});
test('owner API handles call, health, verification and secure background escalation',()=>{assert.match(broadcast,/action === 'verifyOwner'/);assert.match(broadcast,/action === 'callHealth'/);assert.match(broadcast,/action === 'callOwner'/);assert.match(broadcast,/action === 'escalateOwner'/);assert.match(broadcast,/internalEscalation/);assert.match(broadcast,/x-call-bridge-token/);assert.match(ownerCall,/ai-receptionist-live-chi\.vercel\.app\/api\/call-owner/);assert.match(broadcast,/requireSession\(req, res\)/);assert.match(broadcast,/isOwnerEmail\(session\.email\)/);assert.match(broadcast,/reason:'storage'/);});
