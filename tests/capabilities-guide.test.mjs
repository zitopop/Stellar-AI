import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const guide = readFileSync(new URL('../stellar-capabilities-guide.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('Stellar capabilities guide explains public app features including StellarX', () => {
  assert.match(guide, /What Stellar AI can do for you/);
  assert.match(guide, /PUBLIC_GUIDE_ITEMS/);
  assert.match(guide, /StellarX/);
  assert.match(guide, /advanced guided tasks/);
  assert.match(guide, /Website help/);
  assert.match(guide, /Business help/);
  assert.match(guide, /Credits/);
  assert.match(guide, /Support/);
  assert.match(guide, /Safety & approvals/);
});

test('StellarX is inserted into the model picker as a public option', () => {
  assert.match(guide, /installModelPickerOption/);
  assert.match(guide, /data-model-choice=\"stellarx\"/);
  assert.match(guide, /dataset\.publicModel = 'true'/);
  assert.match(guide, /setModel\('Comet', 'StellarX advanced guided tasks'\)/);
  assert.match(guide, /Advanced guided tasks, bigger projects, website and business workflows/);
});

test('owner controls remain gated for privileged viewers', () => {
  assert.match(guide, /OWNER_GUIDE_ITEMS/);
  assert.match(guide, /Owner controls/);
  assert.match(guide, /isPrivilegedViewer/);
  assert.match(guide, /privileged\) appendCards\(grid, OWNER_GUIDE_ITEMS, true\)/);
  assert.match(guide, /ownerCapability/);
  assert.match(guide, /admin/);
  assert.match(guide, /staff/);
});

test('service worker loads the latest public StellarX model picker guide', () => {
  assert.match(sw, /stellar-sw-2026-09-27-capabilities-guide-v5/);
  assert.match(sw, /stellar-capabilities-guide\.js\?v=5/);
  assert.match(sw, /capabilityGuideLoader/);
  assert.match(sw, /\/currency\.js/);
  assert.match(sw, /\/stellar-settings-extensions\.js/);
});
