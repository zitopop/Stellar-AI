import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const focus = readFileSync(new URL('../stellar-app-focus-v23.js', import.meta.url), 'utf8');

test('app focus layer recovers from stuck loading and tap-blocking overlays', () => {
  assert.match(focus, /function releaseIfStartupStuck\(\)/);
  assert.match(focus, /function closeStaleBackdrop\(\)/);
  assert.match(focus, /function recoverClosedOverlays\(\)/);
  assert.match(focus, /backdrop\.hidden=true/);
  assert.match(focus, /pointerEvents='none'/);
  assert.match(focus, /send\.disabled=false/);
  assert.match(focus, /top-usage/);
  assert.match(focus, /window\.StellarInteractionRecovery/);
});

test('app focus layer schedules recovery after startup errors', () => {
  assert.match(focus, /unhandledrejection/);
  assert.match(focus, /window\.addEventListener\('error'/);
  assert.match(focus, /4500,8500,13000/);
});
