import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace uses a stable header chat composer layout', () => {
  assert.match(app, /html,body\{min-width:320px;max-width:100%;overflow-x:hidden\}/);
  assert.match(app, /grid-template-rows:var\(--top\) minmax\(0,1fr\) auto/);
  assert.match(app, /<section id="chat" class="chat">/);
  assert.match(app, /<section class="composer-wrap">/);
});

test('chat content and composer remain centered', () => {
  assert.match(app, /\.chat-inner\{width:min\(var\(--max\),100%\);margin:0 auto/);
  assert.match(app, /\.composer\{width:min\(var\(--max\),100%\);margin:0 auto/);
});

test('mobile drawer does not push chat off screen', () => {
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?\.app\{grid-template-columns:1fr\}/);
  assert.match(app, /transform:translateX\(-104%\)/);
  assert.match(app, /\.side\.open\{transform:translateX\(0\)\}/);
});
