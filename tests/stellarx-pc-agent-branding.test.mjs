import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const entry = await readFile(new URL('../stellar-desktop-agent-ui.js', import.meta.url), 'utf8');
const desktop = await readFile(new URL('../desktop-agent.html', import.meta.url), 'utf8');

test('StellarX PC Agent active-use banner is visible across app surfaces', () => {
  assert.match(entry, /StellarX PC Agent/);
  assert.match(entry, /StellarX is using your PC to help complete this task./);
  assert.match(entry, /stellarx-side-label/);
  assert.match(entry, /Open StellarX PC Agent/);
  assert.doesNotMatch(entry, /Stellar AI is using your PC/);
});

test('Work Agent page uses StellarX live PC wording and blue side label', () => {
  assert.match(desktop, /Stellar AI · StellarX PC Agent/);
  assert.match(desktop, /StellarX is using your PC to help complete this task./);
  assert.match(desktop, /StellarX is using your PC ·/);
  assert.match(desktop, /writing-mode:vertical-rl/);
  assert.match(desktop, /stellarx-side-label/);
});
