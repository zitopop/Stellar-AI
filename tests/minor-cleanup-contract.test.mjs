import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const app = read('app.html');
const index = read('index.html');
const growth = read('stellar-growth-v1.js');
const settingsExt = read('stellar-settings-extensions.js');
const currency = read('currency.js');
const terms = read('terms.html');

test('plans modal has one canonical openPlans declaration', () => {
  assert.equal((app.match(/function\s+openPlans\s*\(/g) || []).length, 1);
  assert.doesNotMatch(app, /openPlansFromFreeUpgradeNudge/);
  assert.match(app, /function showPlansAfterFreeUpgradeNudge\(\)/);
});

test('public feature files use safe storage wrappers instead of raw localStorage', () => {
  for (const source of [index, growth, settingsExt]) {
    assert.doesNotMatch(source, /\blocalStorage\.(?:getItem|setItem|removeItem|clear)\b/);
  }
  assert.match(app, /function safeStorageGet\(key\)[\s\S]*?try \{ return window\.localStorage\.getItem\(key\); \} catch \{ return null; \}/);
  assert.match(app, /function safeStorageSet\(key, value\)[\s\S]*?try \{ window\.localStorage\.setItem\(key, value\); return true; \} catch \{ return false; \}/);
  assert.match(currency, /window\.safeStorageGet = \(key\) => \{ try \{ return window\.localStorage\.getItem\(key\); \} catch \(_\) \{ return null; \} \}/);
  assert.match(currency, /window\.safeStorageSet = \(key, value\) => \{ try \{ window\.localStorage\.setItem\(key, value\); return true; \} catch \(_\) \{ return false; \} \}/);
  assert.match(currency, /window\.safeStorageRemove = \(key\) => \{ try \{ window\.localStorage\.removeItem\(key\); return true; \} catch \(_\) \{ return false; \} \}/);
});

test('UK cancellation wording preserves statutory rights and early-performance rules', () => {
  assert.match(terms, /usually have a 14-day cancellation period where the law provides one/);
  assert.match(terms, /making a payment does not by itself waive a statutory cancellation right/);
  assert.match(terms, /service is fully performed during the cancellation period/);
  assert.match(terms, /expressly requested early performance and acknowledged beforehand/);
  assert.match(terms, /digital content supplied before the end of the cancellation period/);
  assert.match(terms, /expressly consented to immediate supply/);
  assert.match(terms, /we will not treat the cancellation right as waived/);
  assert.match(terms, /Nothing here removes or reduces statutory consumer rights/);
});
