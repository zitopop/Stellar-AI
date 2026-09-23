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

test('support page keeps email-first support inside the site', async () => {
  const html = await readFile('support.html', 'utf8');
  assert.match(html, /deadlyfox10@gmail\.com/);
  assert.match(html, /mailto:deadlyfox10@gmail\.com/);
  assert.doesNotMatch(html, /location(?:\.href)?\s*=\s*["'][^"']*discord/i);
});
