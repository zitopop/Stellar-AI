import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('credit and settings helpers do not observe the whole application tree', () => {
  const credit = read('stellar-credit-ui-v21.js');
  const tabs = read('stellar-settings-tabs-v24.js');

  assert.doesNotMatch(credit, /observe\(document\.body/);
  assert.match(credit, /document\.getElementById\('settings-panel'\)/);
  assert.match(credit, /attributeFilter:\['hidden','aria-hidden'\]/);

  assert.doesNotMatch(tabs, /observe\(document\.documentElement/);
  assert.match(tabs, /observeSettings/);
  assert.match(tabs, /\.observe\(panel,/);
});

test('investor page distinguishes current evidence from future proof points', () => {
  const investors = read('investors.html');
  assert.match(investors, /Stellar AI · investor brief/);
  assert.match(investors, /Investor lens/);
  assert.match(investors, /Evidence today/);
  assert.match(investors, /Next proof/);
  assert.match(investors, /Working product/);
  assert.match(investors, /Retention/);
  assert.match(investors, /Paid conversion/);
  assert.match(investors, /Unit economics/);
  assert.match(investors, /No public fundraising offer/);
  assert.match(investors, /avoids unsupported traction, valuation or return claims/);
});
