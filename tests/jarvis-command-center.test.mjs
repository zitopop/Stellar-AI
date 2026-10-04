import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');
const voiceWorkspace = readFileSync(new URL('../jarvis-workspace.html', import.meta.url), 'utf8');
const chatApi = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

test('workspace exposes a focused Jarvis Voice and Vision route for verified owner state', () => {
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
  assert.match(app, /id="jarvis-nav" href="\/jarvis"/);
  assert.match(jarvis, /Jarvis Vision workspace/);
  for (const label of ['AI Chat','Voice','Computer','Email','Projects','Agents','Vision']) assert.ok(jarvis.includes(label));
});

test('sensitive Jarvis modules stay owner-gated', () => {
  assert.match(jarvis, /data-restricted="true"/);
  assert.match(jarvis, /fetch\('\/api\/get-plan'/);
  assert.match(jarvis, /data\?\.owner===true/);
  assert.match(app, /serverOwner=data\.owner===true\|\|account\.owner===true/);
});

test('app reports protected owner-call health without client secrets', () => {
  assert.match(app, /async function checkOwnerCallHealth\(\)/);
  assert.match(app, /ownerRequest\('\/api\/broadcast',\{action:'callHealth'\}\)/);
  assert.match(app, /data\?\.ready===true/);
  assert.doesNotMatch(app, /RETELL_API_KEY\s*=|CALL_BRIDGE_TOKEN\s*=/);
});


test('Jarvis chat uses a distinct original assistant persona with server-owned entitlement gates', () => {
  assert.match(chatApi, /JARVIS_PUBLIC_CHAT_GUIDANCE/);
  assert.match(chatApi, /JARVIS_OWNER_CHAT_GUIDANCE/);
  assert.match(chatApi, /JARVIS_PLAN_REQUIRED/);
  assert.match(chatApi, /Private Jarvis owner mode requires the verified owner account/);
  assert.match(chatApi, /do not imitate any real actor or copyrighted character/);
  assert.match(voiceWorkspace, /client:\{source:jarvisSource\}/);
  assert.match(voiceWorkspace, /syncJarvisAccess/);
  assert.match(voiceWorkspace, /stellarJarvisHandsFree/);
});

test('main app gives Jarvis a clean first-class entry point', () => {
  assert.match(app, /href="\/jarvis" aria-label="Open Jarvis voice assistant"/);
  assert.match(app, /Provider connected · test call not verified/);
});
