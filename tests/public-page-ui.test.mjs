import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicPages = [
  'terms.html','privacy.html','refunds.html','plans.html',
  ...readdirSync(join(root, 'blog')).filter((filename) => /^blog-.*\.html$/.test(filename)).map((filename) => join('blog', filename)),
].sort();

test('public legal and legacy blog pages keep a dark readable contract', () => {
  assert.ok(publicPages.length >= 60);
  for (const filename of publicPages) {
    const html = readFileSync(join(root, filename), 'utf8');
    assert.match(html, /color-scheme:\s*dark|href="\/site-polish\.css"/, filename);
    assert.match(html, /<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*">/, filename);
  }
});

test('landing and workspace remain dark-only without visible Light controls', () => {
  const landing = readFileSync(join(root, 'index.html'), 'utf8');
  const workspace = readFileSync(join(root, 'app.html'), 'utf8');
  assert.doesNotMatch(landing, /id="theme-toggle"|automaticTheme/);
  assert.doesNotMatch(workspace, /id="side-theme-toggle"|id="seg-light"|setMode\('light'\)/);
});
