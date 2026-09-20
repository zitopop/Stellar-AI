import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('landing pricing preserves paid plan intent when opening the workspace', () => {
  for (const plan of ['starter', 'plus', 'pro']) {
    assert.ok(landing.includes(`href="/app?upgrade=${plan}"`));
  }
});

test('workspace opens and focuses the paid plan requested from landing pricing', () => {
  assert.match(app, /id="upgrade-intent-router"/);
  assert.match(app, /allowedPlans = new Set\(\['starter', 'plus', 'pro'\]\)/);
  assert.match(app, /if \(typeof openPlans !== 'function'\) return;\s+openPlans\(\);/);
  assert.ok(app.includes('plan-card-${plan}'));
  assert.ok(app.includes('plan-btn-${plan}'));
  assert.match(app, /url\.searchParams\.delete\('upgrade'\)/);
});
