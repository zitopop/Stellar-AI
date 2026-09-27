import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('blocking overlays start hidden and inert', () => {
  assert.match(app, /id="backdrop"[^>]*aria-hidden="true"[^>]*hidden inert/);
  assert.match(app, /id="settings-panel"[^>]*aria-hidden="true"[^>]*hidden inert/);
  assert.match(app, /\.drawer-backdrop\[hidden\][\s\S]*?pointer-events:none!important/);
});

test('sidebar backdrop cannot stay clickable after close', () => {
  assert.match(app, /function closeResponsiveSidebar\(\)[\s\S]*?backdrop\.inert=true[\s\S]*?backdrop\.hidden=true/);
  assert.match(app, /function openResponsiveSidebar\(\)[\s\S]*?backdrop\.hidden=false[\s\S]*?backdrop\.inert=false/);
});

test('settings overlay is inert whenever closed', () => {
  assert.match(app, /function closeSettings\(\)[\s\S]*?panel\.inert=true;panel\.hidden=true/);
  assert.match(app, /function openSettings\(\)[\s\S]*?panel\.hidden=false;panel\.inert=false/);
});

test('startup clears orphaned overlays before attaching controls', () => {
  const rescue = app.indexOf('resetTransientUiAfterPageRestore();');
  const submit = app.indexOf("$('chatForm').addEventListener('submit'");
  assert.ok(rescue >= 0 && submit > rescue);
  assert.match(app, /side:not\(\.open\)\{pointer-events:none!important;visibility:hidden!important\}/);
});
