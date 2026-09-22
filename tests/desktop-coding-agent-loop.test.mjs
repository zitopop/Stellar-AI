import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planner = await readFile(new URL('../lib/desktop-plan-handler.js', import.meta.url), 'utf8');
const cloudBridge = await readFile(new URL('../lib/desktop-agent-handler.js', import.meta.url), 'utf8');
const localAgent = await readFile(new URL('../desktop-agent/agent.mjs', import.meta.url), 'utf8');
const ui = await readFile(new URL('../desktop-agent.html', import.meta.url), 'utf8');

test('coding agent inspects a repository before implementation', () => {
  assert.match(planner, /Current phase: \$\{phase\}/);
  assert.match(planner, /In INSPECT phase, return only read_file, list_directory, search_files, git_status, or git_diff actions/);
  assert.match(planner, /In IMPLEMENT phase, use the observations as evidence/);
  assert.match(planner, /Always include git_diff near the end of an implementation plan after any write action/);
});

test('safe repository inspection tools do not require write or shell approval', () => {
  assert.match(cloudBridge, /SAFE_TYPES=new Set\(\['read_file','list_directory','search_files','git_status','git_diff'\]\)/);
  assert.match(localAgent, /case 'search_files':/);
  assert.match(localAgent, /case 'git_status':/);
  assert.match(localAgent, /case 'git_diff':/);
  assert.match(localAgent, /spawn\('git',args,\{cwd,shell:false/);
});

test('desktop UI replans from real inspection output before edits', () => {
  assert.match(ui, /Inspection complete · building grounded implementation plan/);
  assert.match(ui, /observations:evidence/);
  assert.match(ui, /renderPlan\(d\.plan\)/);
  assert.match(ui, /Grounded implementation plan ready\. Review and approve write\/test steps/);
});
