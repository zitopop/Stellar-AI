import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../jarvis-workspace.html', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../lib/assets/jarvis-owner-workflows.js', import.meta.url), 'utf8');
const handler = readFileSync(new URL('../lib/jarvis-mission-handler.js', import.meta.url), 'utf8');

test('Jarvis public page loads private work control without rendering it for visitors', () => {
  assert.match(page, /<script defer src="\/lib\/assets\/jarvis-owner-workflows\.js\?v=20261012"><\/script>/);
  assert.doesNotMatch(page, /id="jw-trigger"/);
  assert.match(panel, /if \(data\.owner === true \|\| data\.accountPlan\?\.owner === true\) mount\(\)/);
  assert.match(panel, /if \(!response\.ok\) return disable\(\)/);
});

test('work orders require owner session and explicit approval, without customer outreach', () => {
  assert.match(handler, /isOwnerEmail\(session\.email\)/);
  assert.match(panel, /addEventListener\('submit', submit\)/);
  assert.match(panel, /requestId = crypto\.randomUUID\(\)/);
  assert.match(panel, /await api\('create'/);
  assert.match(panel, /await api\('run'/);
  assert.match(panel, /Customer|contact|contacted|contacts/);
  assert.doesNotMatch(panel, /fetch\(['"]https:\/\/api\.resend/);
  assert.doesNotMatch(panel, /window\.location\s*=\s*['"]https:\/\/stripe/);
});
