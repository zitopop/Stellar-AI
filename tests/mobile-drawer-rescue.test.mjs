import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const telemetry = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');

test('mobile drawer rescue reuses native controls before installing fallbacks', () => {
  assert.match(telemetry, /function ensureMobileDrawerControls\(\)/);
  assert.match(telemetry, /nativeOpen/);
  assert.match(telemetry, /nativeClose/);
  assert.match(telemetry, /injectedOpen\.forEach\(\(button\) => button\.remove\(\)\)/);
  assert.match(telemetry, /injectedClose\.forEach\(\(button\) => button\.remove\(\)\)/);
  assert.match(telemetry, /dataset\.stellarMobileMenu = 'true'/);
  assert.match(telemetry, /className = 'drawer-backdrop'/);
});

test('workspace polish does not observe the entire app body', () => {
  assert.doesNotMatch(telemetry, /observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.match(telemetry, /observe\(usage,/);
  assert.match(telemetry, /attributeFilter: \['hidden', 'style', 'aria-hidden'\]/);
});

test('mobile drawer tap handling opens and closes reliably', () => {
  assert.match(telemetry, /function openDrawer\(\)/);
  assert.match(telemetry, /function closeDrawer\(\)/);
  assert.match(telemetry, /document\.body\.classList\.add\('drawer-open'\)/);
  assert.match(telemetry, /document\.body\.classList\.remove\('drawer-open'\)/);
  assert.match(telemetry, /document\.addEventListener\('touchend', rescueInteractionState/);
});
