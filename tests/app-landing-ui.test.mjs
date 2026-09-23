import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app does not load retired global workspace override stylesheets', () => {
  for (const retired of ['/stellar-chatgpt-layout.css','/stellar-app-landing-ui.css','/lib/assets/stellar-cosmic-openai.css']) {
    assert.ok(!app.includes(retired), retired);
  }
});

test('workspace uses the current purple neutral visual system', () => {
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /--accent2:#b9b0ff/);
  assert.match(app, /background:radial-gradient/);
  assert.doesNotMatch(app, /--stellar-gold|#D4AF37|#d4af37/);
});

test('visual shell keeps core controls present and shortcuts out of the empty state', () => {
  for (const id of ['sidebar','chat','chatForm','prompt','sendBtn','model-pill']) {
    assert.ok(app.includes('id="' + id + '"'), 'missing #' + id);
  }
  assert.doesNotMatch(app, /<div class="quick">/);
});
