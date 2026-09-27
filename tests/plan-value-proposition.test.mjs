import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('paid plan cards translate credits into understandable value', () => {
  assert.match(index, /1,500 credits\/month/);
  assert.match(index, /up to 300 Star messages\/month/);
  assert.match(index, /Unlock Comet \+ 5,000 credits\/month/);
  assert.match(index, /up to 500 Comet messages\/month/);
  assert.match(index, /Unlock Nova \+ 20,000 credits\/month/);
  assert.match(index, /up to 1,000 Nova messages\/month/);
});

test('plan comparison shows output limits and strongest-model usage', () => {
  assert.match(index, /<td>Max output<\/td>/);
  assert.match(index, /3,500 tokens/);
  assert.match(index, /5,000 tokens/);
  assert.match(index, /8,000 tokens/);
  assert.match(index, /At strongest included model/);
});

test('Settings communicates the key paid unlocks', () => {
  assert.match(app, /Starter £8 · 1,500\/mo/);
  assert.match(app, /Plus £20 · Comet/);
  assert.match(app, /Pro £75 · Nova/);
  assert.match(app, /Starter gives 1,500 monthly credits\. Plus unlocks Comet with 5,000 monthly credits\. Pro unlocks Nova with 20,000 monthly credits\./);
});
