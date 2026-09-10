import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appHtml = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const currency = readFileSync(new URL('../currency.js', import.meta.url), 'utf8');
const finalCss = appHtml.match(/<style id="tap-settings-reliability-final">([\s\S]*?)<\/style>/)?.[1] || '';

test('Settings keeps the stable look route while presenting it as Display', () => {
  assert.ok(appHtml.includes('data-tab="look" onclick="setTab(\'look\')"'));
  assert.ok(appHtml.includes('</svg></i>Display</button>'));
  assert.ok(appHtml.includes('Account, plan, usage and workspace preferences.'));
});

test('phone Settings is a full-width 90dvh bottom sheet with horizontal tabs', () => {
  assert.match(finalCss, /@media \(max-width: 639\.98px\)/);
  assert.match(finalCss, /width:\s*100vw\s*!important/);
  assert.match(finalCss, /max-height:\s*90dvh\s*!important/);
  assert.match(finalCss, /border-radius:\s*22px 22px 0 0\s*!important/);
  assert.match(finalCss, /display:\s*flex\s*!important;\s*flex-wrap:\s*nowrap\s*!important/);
  assert.match(finalCss, /overflow-x:\s*auto\s*!important/);
  assert.match(finalCss, /safe-area-inset-bottom/);
});
test('tablet Settings is centred and capped at 480px', () => {
  assert.match(finalCss, /@media \(min-width: 640px\) and \(max-width: 1023\.98px\)/);
  assert.match(finalCss, /max-width:\s*480px\s*!important/);
});

test('desktop Settings is centred at 400px with internal scrolling', () => {
  assert.match(finalCss, /@media \(min-width: 1024px\)/);
  assert.match(finalCss, /max-width:\s*400px\s*!important/);
  assert.match(finalCss, /max-height:\s*85vh\s*!important/);
  assert.match(finalCss, /overflow-y:\s*auto\s*!important/);
});

test('Settings prevents content overflow and keeps email on one ellipsized line', () => {
  assert.match(finalCss, /overflow-x:\s*hidden\s*!important/);
  assert.match(finalCss, /text-overflow:\s*ellipsis\s*!important/);
  assert.match(finalCss, /white-space:\s*nowrap\s*!important/);
});

test('Settings stylesheet cache remains versioned for deployed browsers', () => {
  assert.ok(currency.includes('/stellar-settings-v4.css?v=7'));
});