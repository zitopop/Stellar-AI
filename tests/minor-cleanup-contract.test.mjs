import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const terms = fs.readFileSync(new URL('../terms.html', import.meta.url), 'utf8');

test('plans modal has one canonical opener and no late monkey patch', () => {
  assert.equal((app.match(/function\s+openPlans\s*\(/g) || []).length, 1);
  assert.equal((app.match(/window\.openPlans\s*=\s*function/g) || []).length, 0);
  assert.match(app, /function closeOtherDialogs\(next\)/);
  assert.match(app, /function openPlans\(\) \{ closeOtherDialogs\('plans'\);/);
});

test('browser storage access is wrapped defensively', () => {
  const bareDirect = app.match(/(?<![.\w])localStorage\.(?:getItem|setItem)/g) || [];
  assert.equal(bareDirect.length, 0);
  assert.equal((app.match(/window\.localStorage\.(?:getItem|setItem)/g) || []).length, 2);
  assert.match(app, /function safeStorageGet\(key\) \{\s+try \{ return window\.localStorage\.getItem\(key\); \} catch \{ return null; \}/);
  assert.match(app, /function safeStorageSet\(key, value\) \{\s+try \{ window\.localStorage\.setItem\(key, value\); return true; \} catch \{ return false; \}/);
});

test('terms explain the UK 14-day cancellation position without automatic waiver', () => {
  assert.match(terms, /usually have a 14-day cancellation period where the law provides one/);
  assert.match(terms, /simply accepting these terms does not by itself waive a statutory cancellation right/);
  assert.match(terms, /expressly consented to immediate supply/);
  assert.match(terms, /acknowledged that the cancellation right will be lost/);
  assert.match(terms, /If those steps have not been completed, we will not treat the right as waived/);
});
