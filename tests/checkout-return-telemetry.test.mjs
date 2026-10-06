import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const telemetry = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');

test('checkout return UI emits telemetry event names accepted by the client telemetry allowlist', () => {
  assert.match(app, /metric\('checkout-success'\)/);
  assert.match(app, /metric\('checkout-cancelled'\)/);
  assert.doesNotMatch(app, /metric\('checkout-success-ui'\)/);
  assert.doesNotMatch(app, /metric\('checkout-cancelled-ui'\)/);
  assert.match(telemetry, /'checkout-success'/);
  assert.match(telemetry, /'checkout-cancelled'/);
});
