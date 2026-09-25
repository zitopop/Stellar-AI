import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../stellar-desktop-agent-ui.js', import.meta.url), 'utf8');

test('Work Agent presents a Codex-style task workspace with safeguards', () => {
  assert.match(page, /Stellar Work Agent/);
  assert.match(page, /Codex-style task workspace/);
  assert.match(page, /Task command centre/);
  assert.match(page, /Inspect before edits/);
  assert.match(page, /Approve write steps/);
  assert.match(page, /Emergency stop/);
  assert.match(page, /Not allowed/);
  assert.match(page, /passwords, API keys, payment details/i);
});

test('Work Agent is discoverable from the signed-in app chrome', () => {
  assert.match(app, /<strong>Work Agent<\/strong><small>Codex-style tasks for your signed-in workspace<\/small>/);
  assert.match(entry, /Open Work Agent/);
  assert.match(entry, /Work Agent Beta/);
});
