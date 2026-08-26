import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const excluded = new Set(['app.html', 'index.html', 'broadcast-template.html']);
const marker = '<link rel="stylesheet" href="/site-polish.css">';
const contentPages = readdirSync(root.pathname)
  .filter((filename) => filename.endsWith('.html') && !excluded.has(filename))
  .sort();
const sharedCss = readFileSync(join(root.pathname, 'site-polish.css'), 'utf8');

 test('all public content pages load the shared dark-only polish layer', () => {
  assert.equal(contentPages.length, 63);
  for (const filename of contentPages) {
    const html = readFileSync(join(root.pathname, filename), 'utf8');
    assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), filename);
  }
  assert.match(sharedCss, /color-scheme:\s*dark/);
  assert.match(sharedCss, /html,\s*\nhtml\.light/);
  assert.match(sharedCss, /body,\s*\nbody\.light/);
});

test('landing and workspace keep the dark-only contract without visible Light controls', () => {
  const landing = readFileSync(join(root.pathname, 'index.html'), 'utf8');
  const workspace = readFileSync(join(root.pathname, 'app.html'), 'utf8');
  assert.doesNotMatch(landing, /id="theme-toggle"/);
  assert.doesNotMatch(landing, /automaticTheme/);
  assert.doesNotMatch(workspace, /id="side-theme-toggle"/);
  assert.doesNotMatch(workspace, /id="seg-light"/);
  assert.doesNotMatch(workspace, /setMode\('light'\)/);
});
