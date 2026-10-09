import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the guide library tells visitors and search engines the real guide count', () => {
  const page = readFileSync(new URL('../blog.html', import.meta.url), 'utf8');
  const links = [...page.matchAll(/<a class="guide" href="([^"]+)"/g)].map(match => match[1]);
  const visibleCount = Number(page.match(/<div class="count">(\d+)/)?.[1]);
  const schemaCount = Number(page.match(/"numberOfItems":(\d+)/)?.[1]);
  assert.ok(links.length >= 1);
  assert.equal(links.length, new Set(links).size, 'Guide URLs must not duplicate');
  assert.equal(visibleCount, links.length, 'Visible guide count must match links');
  assert.equal(schemaCount, links.length, 'Structured guide count must match links');
});

test('guide discovery is linked from the public Stellar homepage', () => {
  const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(homepage, /href="\/blog">Browse free guides/);
});
