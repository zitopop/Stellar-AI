import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['.git','node_modules','.vercel','android','ios']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

test('every public html page links the business palette lock', () => {
  const htmlFiles = walk(root).filter(file => readFileSync(file, 'utf8').includes('<head'));
  const missing = htmlFiles
    .filter(file => !readFileSync(file, 'utf8').includes('stellar-business-palette.css'))
    .map(file => relative(root, file));
  assert.deepEqual(missing, []);
});

test('business palette defines the approved black gold white contract', () => {
  const css = readFileSync(join(root, 'stellar-business-palette.css'), 'utf8');
  for (const token of ['#050505','#101010','#F7F3EA','#F2D675','#FFE89A','#D8CFBE','#22C55E','#EF4444']) {
    assert.match(css, new RegExp(token.replace('#', '#'), 'i'));
  }
});

test('plans and pricing are explicitly hard-locked to the business palette', () => {
  const css = readFileSync(join(root, 'stellar-business-palette.css'), 'utf8');
  for (const selector of ['#plans-modal','.plan-card','.pricing-card','[data-plan]','.popular','.checkout-btn','[id^="plan-btn"]']) {
    assert.ok(css.includes(selector), selector + ' selector should be covered by the palette lock');
  }
  assert.match(css, /Stellar Business Palette Lock v2 - Plans and pricing hard lock/);
});

test('sidebar controls use restrained business styling instead of vibe-coded glow', () => {
  const css = readFileSync(join(root, 'stellar-business-palette.css'), 'utf8');
  assert.match(css, /Stellar Business Palette Lock v3 - restrained sidebar/);
  assert.match(css, /#sidebar button:not\(\.side-new\)/);
  assert.match(css, /background:transparent!important/);
  assert.match(css, /box-shadow:none!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /box-shadow:inset 3px 0 0 #F2D675!important/);
  assert.match(css, /background:#F2D675!important/);
  assert.match(css, /gradient-text/);
});



test('settings landing terms guides and support are page-locked to the business palette', () => {
  const css = readFileSync(join(root, 'stellar-business-palette.css'), 'utf8');
  assert.match(css, /Stellar Business Palette Lock v4 - page-by-page business finish/);
  for (const selector of [
    '#settings-modal', '.settings-row', '.settings-tab',
    '.hero', '.landing-card', '.feature-card',
    '.terms-page', '.terms-shell', '.legal-page',
    '.guide-card', '.guide-page', '.blog-card', 'article',
    '.support-page', '.support-card', '.help-card', '.contact-card'
  ]) {
    assert.ok(css.includes(selector), selector + ' should be page-locked to business palette');
  }
  assert.match(css, /#101010!important/);
  assert.match(css, /#F7F3EA!important/);
  assert.match(css, /#F2D675!important/);
  assert.match(css, /#D8CFBE!important/);
});

test('readable champagne gold pass keeps yellow visible and body copy readable', () => {
  const css = readFileSync(join(root, 'stellar-business-palette.css'), 'utf8');
  assert.match(css, /Stellar Business Palette Lock v6 - readable champagne gold pass/);
  assert.match(css, /--stellar-readable-gold:#F2D675/);
  assert.match(css, /--stellar-readable-gold-2:#FFE89A/);
  assert.match(css, /--stellar-muted:#D8CFBE/);
  assert.match(css, /-webkit-text-fill-color:#050505!important/);
  assert.match(css, /a:hover[\s\S]*#FFE89A/);
});

