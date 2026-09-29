import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const blogPages = readdirSync(join(root, 'blog'))
  .filter((filename) => /^blog-.*\.html$/.test(filename))
  .map((filename) => join('blog', filename))
  .sort();
const publicPages = ['terms.html', 'privacy.html', 'refunds.html', 'plans.html', ...blogPages];
const sharedCss = readFileSync(join(root, 'site-polish.css'), 'utf8');

test('public legal and legacy blog pages keep a dark responsive contract', () => {
  assert.ok(blogPages.length >= 60);
  for (const filename of publicPages) {
    const html = readFileSync(join(root, filename), 'utf8');
    assert.match(html, /color-scheme:\s*dark|href="\/site-polish\.css"/, filename);
    assert.match(
      html,
      /<meta\s+name="viewport"\s+content="[^"]*width=device-width[^"]*">/i,
      filename,
    );
  }
});

test('sticky public navigation reserves the iPhone status-bar safe area', () => {
  const landing = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(landing, /<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*">/);
  assert.match(sharedCss, /color-scheme:\s*dark/);
  assert.match(sharedCss, /body > nav \{[\s\S]*?padding-top: max\(13px, env\(safe-area-inset-top\)\);/);
  assert.match(sharedCss, /\.site-header \{\s*padding-top: env\(safe-area-inset-top\);\s*\}/);
});

test('landing and workspace remain dark-only without visible Light controls', () => {
  const landing = readFileSync(join(root, 'index.html'), 'utf8');
  const workspace = readFileSync(join(root, 'app.html'), 'utf8');
  assert.doesNotMatch(landing, /id="theme-toggle"|automaticTheme/);
  assert.doesNotMatch(workspace, /id="side-theme-toggle"|id="seg-light"|setMode\('light'\)/);
});
