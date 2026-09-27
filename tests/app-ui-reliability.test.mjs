import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('critical app styles load before the final reliability layer', () => {
  const reliability = app.indexOf('id="stellar-input-reliability-v27"');
  const headEnd = app.indexOf('</head>');
  assert.ok(reliability > 0);
  for (const asset of [
    '/stellar-chat-first-v21.css',
    '/stellar-settings-v22.css',
    '/stellar-app-focus-v23.css',
    '/stellar-chatgpt-v24.css',
  ]) {
    const index = app.indexOf(asset);
    assert.ok(index > 0, asset + ' is linked');
    assert.ok(index < reliability, asset + ' loads before final reliability CSS');
    assert.ok(index < headEnd, asset + ' stays in the document head');
  }
});

test('credit balance is present in markup and updated from plan state', () => {
  assert.match(app, /id="stellar-credit-balance">—</);
  assert.match(app, /balance\.textContent=owner\?'∞':total\.toLocaleString\('en-GB'\)/);
  assert.match(app, /Open credits wallet\. Owner access with unlimited credits/);
  assert.match(app, /window\.StellarCreditDisplay\?\.sync\?\.\(\)/);
});

test('closed overlays cannot steal taps and only one major overlay opens at once', () => {
  assert.match(app, /#settings-panel\[hidden\][\s\S]*pointer-events:none!important/);
  assert.match(app, /function openWelcome\(\)\{closeResponsiveSidebar\(\);closeSettings\(\);toggleModelMenu\(false\)/);
  assert.match(app, /function openSettings\(\)\{closeResponsiveSidebar\(\);dismissWelcome\(\);toggleModelMenu\(false\)/);
  assert.match(app, /if\(open\)\{closeResponsiveSidebar\(\);dismissWelcome\(\);closeSettings\(\)\}/);
});

test('phone and tablet layouts keep credits and settings usable', () => {
  assert.match(app, /@media \(min-width:641px\) and \(max-width:1024px\)/);
  assert.match(app, /width:min\(760px,calc\(100vw - 32px\)\)!important/);
  assert.match(app, /@media\(max-width:640px\)[\s\S]*\.stellar-credit-pill\{display:inline-flex!important/);
  assert.match(app, /\.stellar-credit-balance\{display:inline!important/);
  assert.match(app, /settings-close-x,.mobile-menu,#model-pill,.stellar-credit-pill,#account-button,#sendBtn\{touch-action:manipulation!important\}/);
});
