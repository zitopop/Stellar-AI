import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-settings-premium-v45.css', import.meta.url), 'utf8');

test('premium Settings stylesheet is loaded after the app styles', () => {
  assert.match(app, /stellar-settings-premium-v45\.css\?v=20261004-premium-settings/);
  assert.match(app, /Preferences, AI tools, billing and account\./);
});

test('desktop Settings has a bounded premium two-column layout', () => {
  assert.match(css, /width:min\(900px,calc\(100vw - 40px\)\)/);
  assert.match(css, /grid-template-columns:210px minmax\(0,1fr\)/);
  assert.match(css, /settings-dev-content[\s\S]*overflow:auto!important/);
  assert.match(css, /settings-dev-tab\[aria-selected="true"\]/);
});

test('phone Settings is a 90dvh bottom sheet with horizontal tabs', () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /max-height:90dvh!important/);
  assert.match(css, /settings-dev-nav-tabs[\s\S]*overflow-x:auto!important/);
  assert.match(css, /settings-dev-tab[\s\S]*min-height:44px!important/);
  assert.match(css, /safe-area-inset-bottom/);
});

test('Settings keeps premium billing, toggles and account cards', () => {
  assert.match(css, /settings-switch\[aria-checked="true"\]/);
  assert.match(css, /settings-usage-hero/);
  assert.match(css, /settings-billing-meta/);
  assert.match(css, /settings-report-grid/);
  assert.match(css, /settings-api-key-row/);
});
