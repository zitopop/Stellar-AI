import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');

test('workspace exposes a focused Jarvis Voice and Vision route', () => {
  assert.match(app, /href="\/jarvis"/);
  assert.match(jarvis, /Jarvis Vision workspace/);
  for (const label of ['AI Chat','Voice','Computer','Email','Projects','Agents','Vision']) assert.ok(jarvis.includes(label));
});

test('sensitive Jarvis modules stay owner-gated', () => {
  assert.match(jarvis, /data-owner-only="true"/);
  assert.match(jarvis, /fetch\('\/api\/get-plan'/);
  assert.match(jarvis, /data\?\.owner===true/);
});

test('app reports protected owner-call health without client secrets', () => {
  assert.match(app, /function checkOwnerCallHealth\(\)/);
  assert.match(app, /ownerRequest\('\/api\/broadcast',\{action:'callHealth'\}\)/);
  assert.doesNotMatch(app, /RETELL_API_KEY\s*=/);
  assert.doesNotMatch(app, /CALL_BRIDGE_TOKEN\s*=/);
});
