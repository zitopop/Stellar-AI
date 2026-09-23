import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('public root serves the landing page and keeps app entry points visible', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some((route) => route.source === '/' && route.destination === '/index.html'));
  const index = read('index.html');
  assert.match(index, /Stellar AI/);
  assert.match(index, /\/app\?welcome=1|\/app/);
  assert.match(index, /\/support/);
});

test('pricing and terms still publish GBP plan information', () => {
  const index = read('index.html');
  const terms = read('terms.html');
  for (const value of ['Starter', 'Plus', 'Pro', '£8', '£20', '£75']) {
    assert.ok(index.includes(value), 'index missing ' + value);
    assert.ok(terms.includes(value), 'terms missing ' + value);
  }
});

test('broadcast draft keeps review notice and official destination', () => {
  const email = read('archive/templates/broadcast-template.html');
  assert.match(email, /A cleaner, flatter workspace/i);
  assert.match(email, /https:\/\/trystellarai\.com\/app/);
  assert.match(email, /Draft only/i);
  assert.match(email, /The Stellar AI Team/);
});
