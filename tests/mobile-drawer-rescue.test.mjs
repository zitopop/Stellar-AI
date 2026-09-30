import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const telemetry = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app owns native mobile drawer controls', () => {
  assert.match(app, /function openSide\(\)/);
  assert.match(app, /function closeSide\(\)/);
  assert.match(app, /side\.classList\.add\('open'\)/);
  assert.match(app, /side\.classList\.remove\('open'\)/);
  assert.match(app, /backdrop\.addEventListener\('click',closeSide\)/);
  assert.match(app, /@media\(max-width:(?:900|760)px\)/);
});

test('telemetry does not install fallback drawers or observe app UI', () => {
  assert.doesNotMatch(telemetry, /ensureMobileDrawerControls|openDrawer|closeDrawer|MutationObserver|drawer-backdrop/);
  assert.match(telemetry, /Product layout, pricing and account UI must remain owned by the page itself/);
});
