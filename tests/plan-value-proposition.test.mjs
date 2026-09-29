import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanDefinition } from '../lib/pricing.js';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const fmt = n => Number(n).toLocaleString('en-GB');

test('paid plan cards communicate the current server-owned credit allowances', () => {
  const starter=getPlanDefinition('starter'), plus=getPlanDefinition('plus'), pro=getPlanDefinition('pro');
  for (const plan of [starter,plus,pro]) assert.ok(index.includes(fmt(plan.includedCredits) + ' credits/month'), plan.id);
  assert.match(index, /Unlock Comet/);
  assert.match(index, /Unlock Nova/);
  assert.match(index, /Star messages\/month/);
  assert.match(index, /Comet messages\/month/);
  assert.match(index, /Nova messages\/month/);
});

test('plan comparison shows output limits and strongest-model usage', () => {
  assert.match(index, /<td>Max output<\/td>/);
  assert.match(index, /4,000 tokens/);
  assert.match(index, /6,500 tokens/);
  assert.match(index, /10,000 tokens/);
  assert.match(index, /At strongest included model/);
});

test('workspace communicates the current paid plan ladder', () => {
  const starter=getPlanDefinition('starter'), plus=getPlanDefinition('plus'), pro=getPlanDefinition('pro');
  assert.match(app, /planCard\('Starter','£8\/mo'/);
  assert.match(app, /planCard\('Plus','£20\/mo'/);
  assert.match(app, /planCard\('Pro','£75\/mo'/);
  for (const plan of [starter,plus,pro]) assert.ok(app.includes(fmt(plan.includedCredits) + '/month'), plan.id);
});
