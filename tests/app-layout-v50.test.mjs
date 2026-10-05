import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-conversation-layout-v50.css', import.meta.url), 'utf8');

test('app loads the final conversation layout stylesheet after the Stellar brand layer', () => {
  const brand = app.indexOf('/stellar-app-brand-v1.css?v=20261005-1');
  const layout = app.indexOf('/lib/assets/stellar-conversation-layout-v50.css?v=20261005-1');
  assert.ok(brand >= 0);
  assert.ok(layout > brand);
  assert.match(app, /stellar-release" content="2026-10-05-conversation-layout-v50"/);
});

test('conversation layout uses a familiar assistant shell while preserving Stellar branding', () => {
  assert.match(css, /--conversation-bg:#212121/);
  assert.match(css, /--conversation-sidebar:#171717/);
  assert.match(css, /\.app\{grid-template-columns:260px/);
  assert.match(css, /\.top-brand\{display:none!important\}/);
  assert.match(css, /\.chat-inner\{[\s\S]*width:min\(768px,100%\)/);
  assert.match(css, /\.composer\{[\s\S]*background:var\(--conversation-surface\)!important/);
  assert.match(css, /\.user \.bubble\{[\s\S]*background:#303030!important/);
  assert.match(css, /\.assistant \.bubble\{[\s\S]*background:transparent!important/);
});

test('conversation layout keeps mobile drawer behavior and usable touch targets', () => {
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /\.side\.open\{transform:translateX\(0\)!important\}/);
  assert.match(css, /\.mobile-menu\{[\s\S]*min-width:44px!important[\s\S]*min-height:44px!important/);
  assert.match(css, /@media\(max-width:540px\)/);
  assert.match(css, /grid-template-columns:44px 44px minmax\(0,1fr\) 44px 44px!important/);
});
