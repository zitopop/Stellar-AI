import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../stellar-desktop-agent-ui.js', import.meta.url), 'utf8');

test('StellarX PC Agent presents a Codex-style task workspace with safeguards', () => {
  assert.match(page, /StellarX PC Agent/);
  assert.match(page, /Codex-style task workspace/);
  assert.match(page, /Task command centre/);
  assert.match(page, /Inspect before edits/);
  assert.match(page, /Approve write steps/);
  assert.match(page, /Emergency Stop/);
  assert.match(page, /Not allowed/);
  assert.match(page, /passwords, API keys, payment details/i);
});

test('StellarX PC Agent is discoverable from the signed-in app chrome', () => {
  assert.ok(app.includes('<strong>StellarX PC Agent</strong><small>Codex-style tasks for your signed-in workspace</small>'));
  assert.match(entry, /Open StellarX PC Agent/);
  assert.match(entry, /StellarX PC Agent/);
});
