import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace keeps the cosmic visual layer without starter clutter', () => {
  assert.match(app, /stellar-cosmic-openai\.css/);
  assert.match(app, /radial-gradient/);
  assert.doesNotMatch(app, /<div class="quick">/);
});

test('model account settings and billing infrastructure remain visible', () => {
  assert.match(app, /id="model-pill"/);
  assert.match(app, /id="account-box"/);
  assert.match(app, /id="settings-panel"/);
  assert.match(app, /id="set-billing-row"/);
});

test('owner coding tools remain hidden by default', () => {
  assert.match(app, /\.owner-only\{display:none\}/);
  assert.match(app, /id="desktop-agent-nav"[^>]*owner-only/);
  assert.match(app, /id="roblox-studio-nav"[^>]*owner-only/);
});
