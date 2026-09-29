import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const operator = readFileSync(new URL('../stellar-operator-v28.js', import.meta.url), 'utf8');

test('clean workspace no longer depends on the retired injected Stellar Operator layer', () => {
  assert.doesNotMatch(app, /stellar-operator-v28\.(?:css|js)/);
  assert.equal((app.match(/id="chatForm"/g) || []).length, 1);
});

test('reviewed action handoff remains native in the clean app while legacy operator code stays billing-independent', () => {
  assert.match(app, /function openComputerActionCard\(\)/);
  assert.match(app, /Review computer action/);
  assert.match(app, /data-action="launch-stellarx"/);
  assert.match(app, /function launchComputerTask\(\)/);
  assert.doesNotMatch(operator, /fetch\(['"]\/api\/create-checkout/);
});
