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
  for (const token of ['#050505','#101010','#F7F3EA','#D4AF37','#B8B0A0','#22C55E','#EF4444']) {
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
