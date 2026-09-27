import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('startup account requests have a hard timeout', () => {
  assert.match(app, /async function fetchStartup\(url,options=\{\},timeoutMs=8000\)/);
  assert.match(app, /fetchStartup\('\/api\/auth',[\s\S]*?8000\)/);
  assert.match(app, /fetchStartup\('\/api\/get-plan',[\s\S]*?8000\)/);
});

test('failed session refresh still resolves the loading UI', () => {
  assert.match(app, /const refreshed=await refreshSessionBeforeExpiry/);
  assert.match(app, /if\(!refreshed\)await loadPlanTruth\(\)/);
});

test('app renders a usable plan baseline before async account sync', () => {
  assert.match(app, /initImageInput\(\);renderPlanTruth\(\);updateCreditUi\(\)/);
  assert.match(app, /Account sync is taking longer than expected\. You can still use the app\./);
});
