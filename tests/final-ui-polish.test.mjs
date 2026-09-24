import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace keeps the current inline visual layer without starter clutter', () => {
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /radial-gradient/);
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.doesNotMatch(app, /stellar-cosmic-openai\.css/);
});

test('model account settings and billing infrastructure remain visible', () => {
  assert.match(app, /id="model-pill"/);
  assert.match(app, /id="account-button"/);
  assert.match(app, /id="settings-signout-row"/);
  assert.match(app, /id="settings-panel"/);
  assert.match(app, /id="set-billing-row"/);
});

test('agent tools remain hidden until the right access level', () => {
  assert.match(app, /\.owner-only,\.signed-in-only\{display:none\}/);
  assert.match(app, /id="desktop-agent-nav"[^>]*signed-in-only/);
  assert.match(app, /id="roblox-studio-nav"[^>]*owner-only/);
});
