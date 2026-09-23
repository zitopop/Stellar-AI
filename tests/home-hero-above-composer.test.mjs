import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('home hero lives in the centered chat column above the composer row', () => {
  assert.match(app, /\.main\{[^}]*grid-template-rows:var\(--top\) minmax\(0,1fr\) auto/);
  assert.match(app, /\.chat-inner\{width:min\(var\(--max\),100%\);margin:0 auto/);
  assert.ok(app.indexOf('id="homeGreeting"') < app.indexOf('class="composer-wrap"'));
});

test('mobile hero remains readable above the composer', () => {
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.welcome h1\{font-size:clamp\(38px,12vw,56px\)\}/);
  assert.match(app, /\.composer-wrap\{padding:14px 18px calc\(14px \+ env\(safe-area-inset-bottom\)\)/);
});
