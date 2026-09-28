import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('paid plan cards translate credits into understandable value', () => {
  assert.match(index, /5,000 credits\/month/);
  assert.match(index, /up to 1,000 Star messages\/month/);
  assert.match(index, /Unlock Comet \+ 5,000 credits\/month/);
  assert.match(index, /up to 1,500 Comet messages\/month/);
  assert.match(index, /Unlock Nova \+ 20,000 credits\/month/);
  assert.match(index, /up to 2,500 Nova messages\/month/);
});

test('plan comparison shows output limits and strongest-model usage', () => {
  assert.match(index, /<td>Max output<\/td>/);
  assert.match(index, /4,000 tokens/);
  assert.match(index, /6,500 tokens/);
  assert.match(index, /10,000 tokens/);
  assert.match(index, /At strongest included model/);
});

test('workspace communicates the current paid unlocks', () => {
  assert.match(app, /Starter · £8\/mo/);
  assert.match(app, /5,000 credits\/month/);
  assert.match(app, /Plus · £20\/mo/);
  assert.match(app, /15,000 credits\/month/);
  assert.match(app, /Pro · £75\/mo/);
  assert.match(app, /50,000 credits\/month/);
});
