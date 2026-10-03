import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('mobile home keeps a compact uncluttered chat rhythm', () => {
  assert.doesNotMatch(app, /<div class="quick">/);
  assert.match(app, /@media\(max-width:540px\)[\s\S]*?\.welcome h1\{font-size:clamp\(34px,11vw,44px\)\}/);
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?\.chat,\.composer-wrap\{padding-inline:10px\}/);
});

test('mobile composer controls stay touch-safe without horizontal page overflow', () => {
  assert.match(app, /button,a\{touch-action:manipulation/);
  assert.match(app, /\.composer-tool\{width:44px;height:44px;min-height:44px/);
  assert.match(app, /@media\(max-width:640px\)\{\.composer-tool\{min-height:44px\}\}/);
  assert.match(app, /html,body\{margin:0;width:100%;height:100%;overflow:hidden/);
});
