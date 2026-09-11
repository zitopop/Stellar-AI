import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const appCss = fs.readFileSync(new URL('../stellar-final-responsive.css', import.meta.url), 'utf8');
const publicCss = fs.readFileSync(new URL('../site-polish.css', import.meta.url), 'utf8');
const terms = fs.readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const blog = fs.readFileSync(new URL('../blog.html', import.meta.url), 'utf8');

test('final responsive layer loads last and preserves dark-only app', () => {
  assert.match(app, /stellar-final-responsive\.css\?v=1/);
  assert.match(appCss, /color-scheme:\s*dark/);
  assert.match(appCss, /overflow-x:hidden\s*!important/);
});
test('mobile controls and modal sheets meet the touch contract', () => {
  assert.match(appCss, /touch-action:manipulation/);
  assert.match(appCss, /-webkit-tap-highlight-color:transparent/);
  assert.match(appCss, /@media \(max-width:639px\)/);
  assert.match(appCss, /min-height:44px\s*!important/);
  assert.match(appCss, /max-height:90dvh\s*!important/);
  assert.match(appCss, /env\(safe-area-inset-bottom\)/);
  assert.match(appCss, /text-overflow:ellipsis\s*!important/);
});

test('tablet and desktop modal widths match the requested contract', () => {
  assert.match(appCss, /max-width:480px\s*!important/);
  assert.match(appCss, /width:400px\s*!important/);
  assert.match(appCss, /max-width:700px\s*!important/);
  assert.match(appCss, /width:380px\s*!important/);
  assert.match(appCss, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
test('chat home and public pages keep mobile-safe sizing', () => {
  assert.match(appCss, /#txt \{ font-size:16px/);
  assert.match(appCss, /max-width:88%\s*!important/);
  assert.match(appCss, /#suggestion-chips \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(publicCss, /width:min\(calc\(100% - 32px\),1000px\)/);
  assert.match(publicCss, /max-width:720px/);
  assert.match(publicCss, /font-size:16px\s*!important/);
  assert.match(publicCss, /overflow-x:auto\s*!important/);
  assert.ok(terms.includes('/site-polish.css'));
  assert.ok(blog.includes('/site-polish.css'));
});

test('modal exclusivity and overlay touch closing remain wired', () => {
  assert.match(app, /function closeOtherDialogs\(next\)/);
  assert.match(app, /if \(window\.PointerEvent\) modal\.addEventListener\('pointerup', closeFromOverlay\)/);
  assert.match(app, /modal\.addEventListener\('click', closeFromOverlay\)/);
});

test('approved prices stay exact', () => {
  for (const price of ['£0','£8','£20','£75']) assert.ok(app.includes(price));
});
