import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage head does not render literal backslash-n text', () => {
  const head = home.match(/<head>[\s\S]*?<\/head>/)?.[0] || '';
  assert.ok(head, 'homepage head should exist');
  assert.doesNotMatch(head, /\\n/);
});
