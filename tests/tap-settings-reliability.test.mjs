import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const finalCss = app.match(/<style id="tap-settings-reliability-final">([\s\S]*?)<\/style>/)?.[1] || '';
const controller = app.match(/<script id="tap-modal-reliability">([\s\S]*?)<\/script>/)?.[1] || '';

test('interactive controls use first-tap mobile behavior', () => {
  assert.match(finalCss, /touch-action:\s*manipulation\s*!important/);
  assert.match(finalCss, /-webkit-tap-highlight-color:\s*transparent\s*!important/);
  assert.match(finalCss, /#plan-card-starter #plan-btn-starter-annual[\s\S]*min-height:\s*44px\s*!important/);
  assert.match(finalCss, /#plan-card-pro #plan-btn-pro-annual[\s\S]*min-height:\s*44px\s*!important/);
  assert.match(finalCss, /#model-btn[^}]*#send-btn[^}]*min-height:\s*44px/s);
});

test('all modal overlays share reliable outside-tap closing', () => {
  for (const id of ['plans-modal','settings-modal','usage-modal','owner-modal','thanks-modal','redeem-modal','limit-modal','welcome-modal','topup-modal']) {
    assert.match(controller, new RegExp(`'${id}'`));
  }
  assert.match(controller, /pointerup/);
  assert.match(controller, /touchend/);
  assert.match(controller, /event\.target !== modal/);
});
test('Plans Settings Usage and Owner stay mutually exclusive', () => {
  assert.match(app, /function closeOtherDialogs\(next\)/);
  for (const pair of [
    ['openPlans', "closeOtherDialogs('plans')"],
    ['openSettings', "closeOtherDialogs('settings')"],
    ['openUsage', "closeOtherDialogs('usage')"],
    ['openOwner', "closeOtherDialogs('owner')"],
  ]) {
    const index = app.indexOf(`function ${pair[0]}`);
    assert.ok(index >= 0);
    assert.ok(app.slice(index, index + 500).includes(pair[1]));
  }
});

test('Settings has authoritative phone tablet and desktop sizing', () => {
  assert.match(finalCss, /@media \(max-width: 639\.98px\)/);
  assert.match(finalCss, /max-height:\s*90dvh\s*!important/);
  assert.match(finalCss, /flex-wrap:\s*nowrap\s*!important/);
  assert.match(finalCss, /safe-area-inset-bottom/);
  assert.match(finalCss, /@media \(min-width: 640px\) and \(max-width: 1023\.98px\)/);
  assert.match(finalCss, /max-width:\s*480px\s*!important/);
  assert.match(finalCss, /@media \(min-width: 1024px\)/);
  assert.match(finalCss, /max-width:\s*400px\s*!important/);
  assert.match(finalCss, /max-height:\s*85vh\s*!important/);
  assert.match(finalCss, /overflow-x:\s*hidden\s*!important/);
  assert.match(finalCss, /text-overflow:\s*ellipsis\s*!important/);
});

test('final Settings sizing outranks legacy Stellar Orbit layout', () => {
  assert.match(finalCss, /html body\.stellar-orbit-v3:not\(\.light\) #settings-modal > \.set-card/);
  assert.match(finalCss, /html body\.stellar-orbit-v3\.light #settings-modal > \.set-card/);
  assert.match(finalCss, /#settings-modal \.set-body,[\s\S]*?display:\s*block\s*!important/);
  assert.match(finalCss, /#settings-modal \.set-tab,[\s\S]*?width:\s*100%\s*!important;\s*min-width:\s*0\s*!important/);
});
