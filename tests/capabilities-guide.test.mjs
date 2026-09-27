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

test('public model picker lineup has clear roles and badges', () => {
  assert.match(guide, /MODEL_PICKER_COPY/);
  assert.match(guide, /Spark/);
  assert.match(guide, /Fast answers, short drafts and quick fixes/);
  assert.match(guide, /Star/);
  assert.match(guide, /Balanced everyday work and problem solving/);
  assert.match(guide, /Comet/);
  assert.match(guide, /Deeper reasoning for bigger builds, reviews and planning/);
  assert.match(guide, /Nova/);
  assert.match(guide, /Highest power for complex builds and long-form project work/);
  assert.match(guide, /polishModelPickerOptions/);
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

test('service worker loads the latest public model picker guide', () => {
  assert.match(sw, /stellar-sw-2026-09-27-capabilities-guide-v6/);
  assert.match(sw, /stellar-capabilities-guide\.js\?v=6/);
  assert.match(sw, /capabilityGuideLoader/);
  assert.match(sw, /\/currency\.js/);
  assert.match(sw, /\/stellar-settings-extensions\.js/);
});
