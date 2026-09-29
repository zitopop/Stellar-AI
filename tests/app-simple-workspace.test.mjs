import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app is a self-contained simple chat workspace rather than a service-worker-rewritten UI', () => {
  assert.match(app, /<title>Stellar AI Chat<\/title>/);
  assert.match(app, /data-stellar-clean-app="true"/);
  assert.match(app, /id="chatForm"/);
  assert.doesNotMatch(app, /Investor|SEO dashboard|Revenue Ops|operator dashboard/i);
  assert.doesNotMatch(app, /<div class="quick">/);
});

test('simple workspace keeps core user paths visible', () => {
  assert.match(app, /data-open="plans"/);
  assert.match(app, /data-open="credits"/);
  assert.match(app, /data-open="settings"/);
  assert.match(app, /href="\/support">Help<\/a>/);
  assert.match(app, /href="\/legal"/);
  assert.match(app, /id="set-billing-row"/);
});
