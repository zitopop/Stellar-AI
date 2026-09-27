import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const telemetry = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');

test('mobile drawer rescue installs visible controls and backdrop', () => {
  assert.match(telemetry, /function ensureMobileDrawerControls\(\)/);
  assert.match(telemetry, /dataset\.stellarMobileMenu = 'true'/);
  assert.match(telemetry, /className = 'drawer-backdrop'/);
  assert.match(telemetry, /aria-label', 'Open menu'/);
  assert.match(telemetry, /aria-label', 'Close menu'/);
});

test('mobile drawer tap handling opens and closes reliably', () => {
  assert.match(telemetry, /function openDrawer\(\)/);
  assert.match(telemetry, /function closeDrawer\(\)/);
  assert.match(telemetry, /document\.body\.classList\.add\('drawer-open'\)/);
  assert.match(telemetry, /document\.body\.classList\.remove\('drawer-open'\)/);
  assert.match(telemetry, /document\.addEventListener\('touchend', rescueInteractionState/);
});
