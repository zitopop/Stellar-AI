import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');

test('workspace exposes a focused Jarvis Voice and Vision route for verified owner state', () => {
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
  assert.match(app, /id="jarvis-nav" href="\/jarvis"/);
  assert.match(jarvis, /Jarvis Vision workspace/);
  for (const label of ['AI Chat','Voice','Computer','Email','Projects','Agents','Vision']) assert.ok(jarvis.includes(label));
});

test('sensitive Jarvis modules stay owner-gated', () => {
  assert.match(jarvis, /data-owner-only="true"/);
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
