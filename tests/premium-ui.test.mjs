import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../stellar-premium.css', import.meta.url), 'utf8');

test('landing and app load the premium visual layer in head', () => {
  for (const html of [index, app]) {
    const link = html.indexOf('/stellar-premium.css?v=1');
    const head = html.indexOf('</head>');
    assert.ok(link > 0 && link < head);
  }
});

test('premium layer preserves responsive touch-safe app controls', () => {
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /min-width:44px!important;min-height:44px!important/);
  assert.match(css, /\.stellar-sidebar-nav button:last-child/);
});
