import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('workspace uses a stable header chat composer layout', () => {
  assert.match(app, /html,body\{margin:0;width:100%;height:100%;overflow:hidden/);
  assert.match(app, /\.main\{min-width:0;height:100dvh;display:grid;grid-template-rows:58px minmax\(0,1fr\) auto/);
  assert.match(app, /<section class="chat" id="chat">/);
  assert.match(app, /<section class="composer-wrap">/);
});

test('chat content and composer remain centered', () => {
  assert.match(app, /\.chat-inner\{width:min\(var\(--max\),100%\);margin:0 auto/);
  assert.match(app, /\.composer\{width:min\(var\(--max\),100%\);margin:0 auto/);
});

test('mobile drawer does not push chat off screen', () => {
  assert.match(app, /@media\(max-width:900px\)[\s\S]*?\.app\{grid-template-columns:1fr\}/);
  assert.match(app, /transform:translateX\(-105%\)/);
  assert.match(app, /\.side\.open\{transform:translateX\(0\)\}/);
});
