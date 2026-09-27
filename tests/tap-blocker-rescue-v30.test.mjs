import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const refinements = readFileSync(new URL('../lib/assets/stellar-refinements.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('tap-blocking overlays stay inert when hidden even if body classes get stuck', () => {
  assert.match(refinements, /tap-blocker-rescue-v30/);
  assert.match(refinements, /body\.drawer-open\s+\.drawer-backdrop\[hidden\][^{]*\{[^}]*display:none!important[^}]*pointer-events:none!important/);
  assert.match(refinements, /body\.drawer-open\s+#backdrop\[hidden\][^{]*\{[^}]*display:none!important[^}]*pointer-events:none!important/);
  assert.match(refinements, /body:not\(\.drawer-open\)\s+\.drawer-backdrop[^{]*\{[^}]*display:none!important[^}]*pointer-events:none!important/);
});

test('core app already includes the hidden inert contract for main blockers', () => {
  assert.match(app, /id="backdrop"[^>]*aria-hidden="true"[^>]*hidden inert/);
  assert.match(app, /id="settings-panel"[^>]*aria-hidden="true"[^>]*hidden inert/);
  assert.match(app, /#backdrop:not\(\.open\)[^}]*pointer-events:none!important/);
});
