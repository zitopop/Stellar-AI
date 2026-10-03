import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/homepage.css', import.meta.url), 'utf8');

test('homepage supports device width, safe areas, and reduced motion', () => {
  assert.match(html, /name="viewport"[^>]*width=device-width[^>]*viewport-fit=cover/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('responsive layouts remain explicit without hiding page overflow', () => {
  for (const width of [430,700,900,1100]) assert.ok(css.includes('@media(max-width:' + width + 'px)'));
  assert.match(css, /minmax\(0,1fr\)/);
  assert.doesNotMatch(css, /(?:html|body)\s*\{[^}]*overflow-x:\s*hidden/);
});
