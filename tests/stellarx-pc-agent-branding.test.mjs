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

test('Work Agent page uses StellarX live PC wording with calm active indicators', () => {
  assert.match(desktop, /<div class="brand">StellarX <span class="small">Work Agent Beta<\/span><\/div>/);
  assert.match(desktop, /StellarX is using your PC to help complete this task./);
  assert.ok(desktop.includes("'StellarX is '+activity"));
  assert.match(desktop, /using the keyboard/);
  assert.match(desktop, /using the mouse/);
  assert.match(desktop, /\.stellar-use-led\{display:none!important\}/);
  assert.match(desktop, /stellarx-side-label/);
});

test('StellarX shows a calm online status badge before active tasks', () => {
  assert.match(desktop, /stellarxOnlineSide/);
  assert.match(desktop, /StellarX PC Online/);
  assert.ok(desktop.includes('updateUseBar(d)'));
  assert.match(entry, /stellarx-pc-online-side/);
  assert.match(entry, /StellarX PC Online/);
  assert.match(entry, /background:#18181c/);
  assert.match(entry, /background:#181b19/);
  assert.doesNotMatch(entry, /linear-gradient\(92deg,#0037ff/);
});
