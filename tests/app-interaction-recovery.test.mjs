import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('app keeps phone controls tappable and inactive overlays inert',()=>{
  assert.match(app,/stellar-interaction-recovery-v1/);
  assert.match(app,/#backdrop:not\(\.open\)[^}]*pointer-events:none!important/);
  assert.match(app,/#account-button\{display:inline-flex!important/);
  assert.match(app,/home-welcome h1[^}]*white-space:normal!important/);
});

test('app actively refreshes the service worker without cached navigation HTML',()=>{
  assert.match(app,/stellar-app-update-guard-v1/);
  assert.match(app,/serviceWorker\.register\('\/sw\.js',\{updateViaCache:'none'\}\)/);
  assert.match(sw,/interaction-recovery-v1/);
  assert.match(sw,/fetch\(request, \{ cache: 'no-store' \}\)/);
});