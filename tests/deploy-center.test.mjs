import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync('app.html', 'utf8');
const page = readFileSync('deploy-center.html', 'utf8');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

test('Deploy Center is owner-only in Settings and routed publicly without secrets', () => {
  assert.match(app, /id="deploy-center-nav"/);
  assert.match(app, /class="settings-row owner-only"/);
  assert.match(app, /location\.href='\/deploy'/);
  assert.ok(vercel.rewrites.some((route) => route.source === '/deploy' && route.destination === '/deploy-center.html'));
});

test('Deploy Center explains safe deploy control without exposing credentials', () => {
  assert.match(page, /Deploy once\./);
  assert.match(page, /npm run deploy:safe -- --yes/);
  assert.match(page, /Automatic Git deployments are disabled/);
  assert.doesNotMatch(page, /TWILIO_AUTH_TOKEN|GMAIL_REFRESH_TOKEN|VERCEL_TOKEN|OWNER_PHONE|sk_live|sk_test/i);
});
