import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../jarvis-workspace.html', import.meta.url), 'utf8');
const script = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(Boolean);

test('Jarvis main chat only exposes business missions after verified owner access', () => {
  assert.match(page, /ownerVerified = false/);
  assert.match(page, /const owner=d\?\.owner===true\|\|d\?\.accountPlan\?\.owner===true/);
  assert.match(page, /if\(owner\)\{jarvisSource='jarvis-owner';jarvisEntitled=true;ownerVerified=true;showBusinessMissionControl\(\)/);
  assert.match(page, /ownerVerified=false;\$\('jarvis-business-mission'\)\?\.remove\(\)/);
  assert.match(page, /button\.id='jarvis-business-mission'/);
  assert.match(page, /row\.insertBefore\(button,\$\('send'\)\)/);
});

test('main Jarvis business link pre-fills AI OS but cannot start an external action', () => {
  assert.match(page, /function openBusinessMission\(\)/);
  assert.match(page, /if\(!ownerVerified\)return/);
  assert.match(page, /location\.href='\/ai-os\?objective='\+encodeURIComponent\(objective\)/);
  assert.doesNotMatch(page.slice(page.indexOf('function openBusinessMission()'), page.indexOf('function showBusinessMissionControl()')), /fetch\(|api\('create'|sendMessage\(/);
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});
