import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../stellar-desktop-agent-ui.js', import.meta.url), 'utf8');

test('StellarX PC Agent presents a Codex-style task workspace with safeguards', () => {
  assert.match(page, /StellarX PC Agent/);
  assert.match(page, /Codex-style task workspace/);
  assert.match(page, /Give <span class="agent-name">StellarX<\/span> a job/);
  assert.match(page, /Inspect first/);
  assert.match(page, /Approval for actions/);
  assert.match(page, /Emergency Stop/);
  assert.match(page, /Not allowed/);
  assert.match(page, /passwords, API keys, payment details/i);
  assert.match(page, /id="taskProgress"/);
  assert.match(page, /Review/);
  assert.match(page, /Fix/);
  assert.match(page, /Build/);
  assert.match(page, /Verify/);
});

test('StellarX Computer is discoverable from chat and accepts a reviewed task handoff', () => {
  assert.match(app, /function openComputerActionCard\(\)/);
  assert.match(app, />▣ StellarX<\/button>/);
  assert.match(app, /'\/desktop\?task='\+encodeURIComponent\(task\)/);
  assert.match(page, /new URLSearchParams\(location\.search\)\.get\('task'\)/);
  assert.match(entry, /Open StellarX PC Agent/);
});
