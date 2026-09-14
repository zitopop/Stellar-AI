import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
test('Stellar exposes owner Jarvis call command',()=>{assert.match(app,/function ownerCallCommand\(text\)/);assert.match(app,/ownerRequest\('\/api\/broadcast', \{ action: 'callOwner', purpose \}\)/);});
test('existing owner API handles call and verification',()=>{assert.match(broadcast,/action === 'verifyOwner'/);assert.match(broadcast,/action === 'callOwner'/);assert.match(broadcast,/ai-receptionist-live-chi\.vercel\.app\/api\/call-owner/);assert.match(broadcast,/requireSession\(req, res\)/);assert.match(broadcast,/isOwnerEmail\(session\.email\)/);});
