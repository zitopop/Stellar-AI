import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('mobile home keeps a compact uncluttered first-build rhythm', () => {
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.welcome h1\{font-size:clamp\(38px,12vw,56px\)\}/);
  assert.match(app, /@media\(max-width:420px\)[\s\S]*?\.chat\{padding-inline:10px\}/);
});

test('mobile composer controls wrap without horizontal overflow', () => {
  assert.match(app, /html,body\{min-width:320px;max-width:100%;overflow-x:hidden\}/);
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.credit-option\{flex:1 1 100%;max-width:100%/);
  assert.match(app, /@media\(max-width:420px\)[\s\S]*?\.image-status\{order:3;flex-basis:100%\}/);
});
