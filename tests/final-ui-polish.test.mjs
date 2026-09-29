import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace keeps the current clean inline visual layer without starter clutter', () => {
  assert.match(app, /--accent:#9b8cff/);
  assert.match(app, /background:var\(--bg\)/);
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.doesNotMatch(app, /stellar-cosmic-openai\.css/);
});

test('model account settings and billing entry points remain visible', () => {
  assert.match(app, /id="modelBtn"/);
  assert.match(app, /id="creditPill"/);
  assert.match(app, /id="accountButton"/);
  assert.match(app, /id="panelBackdrop"/);
  assert.match(app, /data-open="plans"/);
});

test('legacy owner-only agent navigation is not leaked into the clean chat shell', () => {
  assert.doesNotMatch(app, /id="desktop-agent-nav"/);
  assert.doesNotMatch(app, /id="roblox-studio-nav"/);
  assert.doesNotMatch(app, /<p class="side-title">Agents<\/p>/);
});
