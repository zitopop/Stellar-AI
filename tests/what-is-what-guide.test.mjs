import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('plain-English guide explains product, credits, wallet and TOS clearly', () => {
  const guide = read('what-is-what.html');
  assert.match(guide, /What’s what in Stellar AI/);
  assert.match(guide, /StellarX/);
  assert.match(guide, /Wallet credits/);
  assert.match(guide, /TOS means Terms of Service/);
  assert.match(guide, /Do not write “no refunds” everywhere/);
  assert.match(guide, /AI output needs review/);
  assert.match(guide, /legal operator\/controller details (?:must be )?real/i);
});

test('legal hub links to the plain-English guide before formal policy links', () => {
  const legal = read('legal.html');
  assert.match(legal, /href="\/what-is-what\.html"/);
  assert.match(legal, /Plain-English explanation of Stellar AI, StellarX, credits, wallet top-ups, plugins, TOS, refunds and trust wording/);
  assert.match(legal, /The formal policies below control if there is ever a conflict/);
  assert.match(legal, /href="\/terms"/);
  assert.match(legal, /href="\/refunds"/);
  assert.match(legal, /href="\/business-terms"/);
});
