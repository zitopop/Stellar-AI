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
  assert.match(appCss, /min-height:100dvh/);
});

test('mobile controls and modal sheets meet the touch contract', () => {
  assert.match(appCss, /--stellar-touch:44px/);
  assert.match(appCss, /touch-action:manipulation/);
  assert.match(appCss, /-webkit-tap-highlight-color:transparent/);
  assert.match(appCss, /@media \(max-width:639px\)/);
  assert.match(appCss, /min-height:var\(--stellar-touch\)\s*!important/);
  assert.match(appCss, /max-height:90dvh\s*!important/);
  assert.match(appCss, /env\(safe-area-inset-bottom\)/);
  assert.match(appCss, /text-overflow:ellipsis\s*!important/);
  assert.match(appCss, /grid-template-columns:1fr\s*!important/);
});

test('tablet and desktop layouts stay readable at their breakpoints', () => {
  assert.match(appCss, /@media \(min-width:640px\) and \(max-width:1023px\)/);
  assert.match(appCss, /max-width:520px\s*!important/);
  assert.match(appCss, /max-width:760px\s*!important/);
  assert.match(appCss, /@media \(min-width:1024px\)/);
  assert.match(appCss, /width:420px\s*!important/);
  assert.match(appCss, /max-width:900px\s*!important/);
  assert.match(appCss, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(appCss, /@media \(min-width:1440px\)/);
  assert.match(appCss, /max-width:820px\s*!important/);
});

test('chat home and public pages keep mobile-safe sizing', () => {
  assert.match(appCss, /#txt \{ font-size:16px/);
  assert.match(appCss, /max-width:92%\s*!important/);
  assert.match(appCss, /overflow-wrap:anywhere/);
  assert.match(appCss, /-webkit-overflow-scrolling:touch/);
  assert.match(publicCss, /width:min\(calc\(100% - 32px\),1000px\)/);
  assert.match(publicCss, /max-width:720px/);
  assert.match(publicCss, /font-size:16px\s*!important/);
  assert.match(publicCss, /overflow-x:auto\s*!important/);
  assert.ok(terms.includes('/site-polish.css'));
  assert.ok(blog.includes('/site-polish.css'));
});

test('accessibility and modal safety remain wired', () => {
  assert.match(appCss, /:focus-visible/);
  assert.match(appCss, /prefers-reduced-motion:reduce/);
  assert.match(app, /function closeOtherDialogs\(next\)/);
  assert.match(app, /if \(window\.PointerEvent\) modal\.addEventListener\('pointerup', closeFromOverlay\)/);
  assert.match(app, /modal\.addEventListener\('click', closeFromOverlay\)/);
});

test('approved prices stay exact', () => {
  for (const price of ['£0','£8','£20','£75']) assert.ok(app.includes(price));
});
