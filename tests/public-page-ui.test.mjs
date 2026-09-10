import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const marker = '<link rel="stylesheet" href="/assets/css/site-polish.css">';
const sharedPolishPages = [
  'affiliate.html',
  'terms.html',
  ...readdirSync(join(root, 'blog')).filter((filename) => /^blog-.*\.html$/.test(filename)).map((filename) => join('blog', filename)),
].sort();
const sharedCss = readFileSync(join(root, 'site-polish.css'), 'utf8');

test('legacy public pages that use the shared layer keep the dark-only polish contract', () => {
  assert.ok(sharedPolishPages.length >= 60);
  for (const filename of sharedPolishPages) {
    const html = readFileSync(join(root, filename), 'utf8');
    assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), filename);
  }
  assert.match(sharedCss, /color-scheme:\s*dark/);
  assert.match(sharedCss, /html,\s*\nhtml\.light/);
  assert.match(sharedCss, /body,\s*\nbody\.light/);
});

test('sticky public navigation reserves the iPhone status-bar safe area', () => {
  const landing = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(landing, /<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*">/);
  assert.match(sharedCss, /body > nav \{[\s\S]*?padding-top: max\(13px, env\(safe-area-inset-top\)\);/);
  assert.match(sharedCss, /\.site-header \{\s*padding-top: env\(safe-area-inset-top\);\s*\}/);
});

test('landing and workspace keep the dark-only contract without visible Light controls', () => {
  const landing = readFileSync(join(root, 'index.html'), 'utf8');
  const workspace = readFileSync(join(root, 'app.html'), 'utf8');
  assert.doesNotMatch(landing, /id="theme-toggle"/);
  assert.doesNotMatch(landing, /automaticTheme/);
  assert.doesNotMatch(workspace, /id="side-theme-toggle"/);
  assert.doesNotMatch(workspace, /id="seg-light"/);
  assert.doesNotMatch(workspace, /setMode\('light'\)/);
});
