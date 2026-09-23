import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('home hero lives in the centered chat column above the composer row', () => {
  assert.ok(app.includes('.main{min-width:0;display:grid;grid-template-rows:var(--top) minmax(0,1fr) auto'));
  assert.ok(app.includes('.chat-inner{width:min(var(--max),100%);margin:0 auto'));
  assert.ok(app.indexOf('id="homeGreeting"') < app.indexOf('class="composer-wrap"'));
});

test('mobile hero remains readable above the composer', () => {
  assert.ok(app.includes('@media(max-width:640px)'));
  assert.ok(app.includes('.welcome h1{margin:0;color:var(--text);font-size:clamp(38px,5.4vw,62px)'));
  assert.ok(app.includes('.composer-wrap{position:sticky;bottom:0;z-index:9;padding:12px 18px calc(12px + env(safe-area-inset-bottom))'));
});
