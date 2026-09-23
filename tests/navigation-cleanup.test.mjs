import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const orbit = readFileSync(new URL('../stellar-orbit.js', import.meta.url), 'utf8');

test('clean sidebar replaces footer utilities with a dedicated tools section', () => {
  assert.match(orbit, /\.side-foot\{display:none!important\}/);
  assert.match(orbit, /Tools & account/);
  assert.match(orbit, /Usage & credit/);
  assert.match(orbit, /Terms & privacy/);
  assert.match(orbit, /data-orbit-open-settings/);
});

test('desktop top bar exposes clean product and legal navigation', () => {
  assert.match(orbit, /stellar-top-nav/);
  assert.match(orbit, /href="\/models"/);
  assert.match(orbit, /data-stellar-top-plans/);
  assert.match(orbit, />Plans<\/button>/);
    assert.match(orbit, /href="\/terms"/);
  assert.match(orbit, /data-stellar-top-picker/);
});

test('responsive nav keeps small screens clean without adding a bottom nav', () => {
  assert.match(orbit, /@media\(max-width:1100px\)/);
  assert.match(orbit, /\.stellar-top-nav\{display:none\}/);
  assert.doesNotMatch(orbit, /stellar-bottom-nav/);
});
