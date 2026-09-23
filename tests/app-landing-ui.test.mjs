import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app loads current workspace visual layers in deterministic order', () => {
  const layout = app.indexOf('/stellar-chatgpt-layout.css');
  const landing = app.indexOf('/stellar-app-landing-ui.css');
  const cosmic = app.indexOf('/lib/assets/stellar-cosmic-openai.css');
  assert.ok(layout >= 0 && landing > layout && cosmic > landing);
});

test('workspace uses the public purple cosmic accent family', () => {
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /--accent2:#b9b0ff/);
  assert.match(app, /radial-gradient/);
});

test('visual layers keep core workspace controls present', () => {
  for (const id of ['sidebar','chat','chatForm','prompt','sendBtn','model-pill']) {
    assert.ok(app.includes('id="' + id + '"'), 'missing #' + id);
  }
});
