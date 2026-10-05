import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url);
const oldSupport = 'support' + '@trystellarai.com';
const newSupport = 'deadlyfox10@gmail.com';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['.git','node_modules','.vercel'].includes(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(?:html|js|mjs|md|txt)$/i.test(name)) out.push(full);
  }
  return out;
}

test('customer contact surfaces use the DeadlyFox Gmail address consistently', () => {
  const offenders = [];
  for (const file of walk(root.pathname)) {
    if (relative(root.pathname, file) === 'tests/contact-identity.test.mjs') continue;
    const content = readFileSync(file, 'utf8');
    if (content.includes(oldSupport)) offenders.push(relative(root.pathname, file));
  }
  assert.deepEqual(offenders, []);
});

test('primary support surfaces identify DeadlyFox and the public contact email', () => {
  const support = readFileSync(new URL('../support.html', import.meta.url), 'utf8');
  const legal = readFileSync(new URL('../legal.html', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const emailConfig = readFileSync(new URL('../lib/email-config.js', import.meta.url), 'utf8');
  assert.match(support, /DeadlyFox support/);
  assert.match(support, /DeadlyFox · deadlyfox10@gmail\.com/);
  assert.match(legal, /contact DeadlyFox at/);
  assert.match(home, /DeadlyFox · deadlyfox10@gmail\.com/);
  assert.match(emailConfig, /SUPPORT_EMAIL = 'deadlyfox10@gmail\.com'/);
});
