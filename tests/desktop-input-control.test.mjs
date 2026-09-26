import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bridge = readFileSync(new URL('../lib/desktop-agent-handler.js', import.meta.url), 'utf8');
const local = readFileSync(new URL('../desktop-agent/agent.mjs', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../lib/desktop-plan-handler.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');

test('Stella X mouse and keyboard actions stay explicit and approval gated', () => {
  for (const type of ['keyboard_shortcut','type_text','mouse_move','mouse_click']) {
    assert.match(bridge, new RegExp(type));
    assert.match(local, new RegExp(`case '${type}'`));
    assert.match(planner, new RegExp(type));
  }
  assert.match(bridge, /DEFAULT_POLICY=.*input:false/);
  assert.match(bridge, /Mouse and keyboard control is disabled/);
  assert.match(bridge, /Typing likely credentials or secrets/);
  assert.match(local, /task\.approved!==true/);
});

test('Stella X visibly announces input control and reports PC usage', () => {
  assert.match(page, /id="stellarUseSideLabel"/);
  assert.ok(page.includes("keyboard=['type_text','keyboard_shortcut'].includes(type),mouse=['mouse_move','mouse_click'].includes(type)"));
  assert.ok(page.includes("activity=keyboard?'using the keyboard':mouse?'using the mouse'"));
  assert.ok(page.includes("'Stella X is '+activity"));
  assert.match(page, /id="permInput"/);
  assert.match(page, /id="pcUsageLabel"/);
  assert.match(page, /id="pcUsageFill"/);
});

test('normal users get percentage usage while owner PC usage is unlimited', () => {
  assert.match(bridge, /PC_TASK_LIMIT=120/);
  assert.match(bridge, /pcUsage\(email\)/);
  assert.match(bridge, /isOwnerEmail\(email\).*unlimited:true/);
  assert.match(bridge, /!isOwnerEmail\(session\.email\).*underLimit/);
  assert.match(planner, /isOwnerEmail\(session\.email\)\?true:await allowPlan/);
  assert.match(page, /usage\.unlimited\?'Unlimited'/);
  assert.match(page, /usage\.percent/);
});
