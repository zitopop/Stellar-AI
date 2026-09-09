import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appHtml = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const settingsCss = readFileSync(new URL('../stellar-settings-v4.css', import.meta.url), 'utf8');
const currency = readFileSync(new URL('../currency.js', import.meta.url), 'utf8');

test('Settings keeps the stable look route while presenting it as Display', () => {
  assert.ok(appHtml.includes('data-tab="look" onclick="setTab(\'look\')"'));
  assert.ok(appHtml.includes('</svg></i>Display</button>'));
  assert.ok(appHtml.includes('Account, plan, usage and workspace preferences.'));
});

test('desktop Settings uses a clear left rail and independently scrollable content panel', () => {
  assert.ok(settingsCss.includes('@media (min-width: 768px)'));
  assert.ok(settingsCss.includes('grid-template-columns: 190px minmax(0, 1fr) !important;'));
  assert.ok(settingsCss.includes('overflow-y: auto !important;'));
});

test('mobile Settings is an authoritative full-width sheet with a 3 by 2 tab grid', () => {
  assert.ok(settingsCss.includes('@media (max-width: 767px)'));
  assert.ok(settingsCss.includes('height: min(94dvh, 760px) !important;'));
  assert.ok(settingsCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr)) !important;'));
  assert.ok(settingsCss.includes('@media (max-width: 420px)'));
  assert.ok(settingsCss.includes('#settings-modal .set-item:has(.seg-wrap)'));
});

test('Settings stylesheet cache is bumped so the UI repair reaches deployed browsers', () => {
  assert.ok(currency.includes('/stellar-settings-v4.css?v=7'));
});
