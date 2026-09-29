import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('home greeting lives in the centered chat column above the composer row', () => {
  assert.match(app, /\.main\{min-width:0;height:100dvh;display:grid;grid-template-rows:58px minmax\(0,1fr\) auto/);
  assert.match(app, /\.chat-inner\{width:min\(var\(--max\),100%\);margin:0 auto/);
  assert.ok(app.indexOf('id="chatInner"') < app.indexOf('class="composer-wrap"'));
  assert.match(app, /function welcomeHtml\(\)/);
});

test('mobile greeting remains readable above the composer', () => {
  assert.match(app, /@media\(max-width:540px\)[\s\S]*?\.welcome h1\{font-size:clamp\(34px,11vw,44px\)\}/);
  assert.match(app, /\.composer-wrap\{padding:10px 16px max\(16px,calc\(10px \+ env\(safe-area-inset-bottom\)\)\)/);
});
