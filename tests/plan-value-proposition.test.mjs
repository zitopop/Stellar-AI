import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('paid plan cards translate credits into understandable value', () => {
  assert.match(index, /900 credits\/day/);
  assert.match(index, /up to 180 Star messages\/day/);
  assert.match(index, /Unlock Comet \+ 2,500 credits\/day/);
  assert.match(index, /up to 250 Comet messages\/day/);
  assert.match(index, /Unlock Nova \+ 8,000 credits\/day/);
  assert.match(index, /up to 400 Nova messages\/day/);
});

test('plan comparison shows output limits and strongest-model usage', () => {
  assert.match(index, /<td>Max output<\/td>/);
  assert.match(index, /3,500 tokens/);
  assert.match(index, /5,000 tokens/);
  assert.match(index, /8,000 tokens/);
  assert.match(index, /At strongest included model/);
});

test('Settings communicates the key paid unlocks', () => {
  assert.match(app, /Starter £8 · 3× Free/);
  assert.match(app, /Plus £20 · Comet/);
  assert.match(app, /Pro £75 · Nova/);
  assert.match(app, /Starter gives 3× Free daily credits\. Plus unlocks Comet\. Pro unlocks Nova/);
});
