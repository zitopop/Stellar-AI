import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('landing page keeps the approved clean chat-first hero', () => {
  assert.match(landing, /stellar-serious-chat-first-v37/);
  assert.match(landing, /Ask anything\.<br>Get real work done\./);
  assert.match(landing, /Start free/);
  assert.match(landing, /See plans/);
});

test('landing value stays in authored HTML rather than runtime injections', () => {
  assert.match(landing, /One AI workspace\. Three simple layers\./);
  assert.match(landing, /Ask Stellar AI/);
  assert.match(landing, /Hand it to StellarX/);
  assert.match(landing, /Add tools when needed/);
  assert.doesNotMatch(analytics, /insertAdjacentElement|replaceChildren|innerHTML|stellar-home-focus/);
});

test('landing page uses the current usage model', () => {
  assert.match(landing, /Daily usage allowance/);
  assert.match(landing, /Standard monthly usage/);
  assert.match(landing, /Higher monthly usage/);
  assert.match(landing, /Highest monthly usage/);
  assert.doesNotMatch(landing, /credits\/month|Wallet top.?ups|Buy Stellar Credits/i);
});

test('landing page remains mobile safe', () => {
  assert.match(landing, /@media\(max-width:760px\)/);
  assert.match(landing, /overflow-x:hidden/);
  assert.match(landing, /grid-template-columns:1fr/);
});
