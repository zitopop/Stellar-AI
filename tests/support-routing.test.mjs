import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('support route resolves to the first-party support centre', async () => {
  const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
  const route = (vercel.rewrites || []).find((entry) => entry.source === '/support');
  assert.ok(route, 'Expected /support rewrite');
  assert.equal(route.destination, '/support.html');
});

test('landing-page Support link is not a Discord redirect', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /href=["']\/support["'][^>]*>Support<\/a>/i);
  assert.doesNotMatch(html, /href=["'][^"']*discord[^"']*["'][^>]*>Support<\/a>/i);
});

test('support page keeps Discord optional and separate', async () => {
  const html = await readFile('support.html', 'utf8');
  assert.match(html, /href=["']\/support["']/i);
  assert.match(html, />Discord<\/a>/i);
  assert.doesNotMatch(html, /location(?:\.href)?\s*=\s*["'][^"']*discord/i);
});
