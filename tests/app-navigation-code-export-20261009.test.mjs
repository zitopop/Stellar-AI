import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-home-clarity-v1.css', import.meta.url), 'utf8');

test('app navigation exposes the approved plugin directory', () => {
  assert.match(app, /href="\/plugins" title="Apps and plugins"/);
  assert.match(app, /Browse apps and plugins/);
  assert.match(app, /href="\/free-tools"/);
});

test('code exports support common languages without adding Lua comments to them', () => {
  assert.match(app, /javascript:'js'/);
  assert.match(app, /typescript:'ts'/);
  assert.match(app, /python:'py'/);
  assert.match(app, /data-code-action="\'+(ext==='lua'?'download-lua':'download-code')/);
  assert.match(app, /contents=ext==='lua'\?withStellarLuaWatermark\(text\):text/);
  assert.match(app, /link.download=base\+'\.'\+ext/);
  assert.match(app, /downloadableCount=responseBubble\?\.querySelectorAll\?\.\('\[data-code-action="download-lua"\],\[data-code-action="download-code"\]'\)/);
});

test('successful chat status is visually quiet but warnings and errors remain visible', () => {
  assert.match(css, /\.composer-status\.good\{[\s\S]*?clip:rect\(0 0 0 0\)/);
  assert.match(css, /\.composer-status\.warn,[\s\S]*?\.composer-status\.error\{/);
  assert.match(app, /id="status" role="status" aria-live="polite"/);
});
