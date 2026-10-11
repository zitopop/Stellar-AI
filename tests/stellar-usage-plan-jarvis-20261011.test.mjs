import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('unverified chat usage is never presented as a confirmed full balance', () => {
  const app = read('app.html');
  assert.match(app, /id="usageCount">Sign in to see usage<\/strong>/);
  assert.doesNotMatch(app, /id="usageCount">100% left<\/strong>/);
  assert.match(app, /usageCount\.textContent=usageText/);
});

test('all customers including owner accounts can reach the complete plans page', () => {
  const app = read('app.html');
  const link = app.match(/<a\b[^>]*id="side-plan-button"[^>]*>/)?.[0] || '';
  assert.match(link, /href="\/plans"/);
  assert.match(link, /aria-label="View all Stellar AI subscription plans"/);
  assert.match(app, /sidePlanButton\.hidden=false/);
  assert.doesNotMatch(app, /sidePlanButton\.hidden=serverOwner/);
});

test('landing presents four plans and two clear first actions without changing prices', () => {
  const index = read('index.html');
  const plans = [...index.matchAll(/data-plan="(free|starter|plus|pro)"/g)].map((match) => match[1]);
  assert.deepEqual(plans, ['free', 'starter', 'plus', 'pro']);
  assert.match(index, /data-conversion="start-free"/);
  assert.match(index, /href="#plans" aria-label="Compare Free, Starter, Plus and Pro plans"/);
  assert.match(index, /id="plans"/);
});

test('Jarvis uses a quiet Midnight shell without losing voice controls', () => {
  const jarvis = read('jarvis-workspace.html');
  assert.match(jarvis, /id="stellar-jarvis-midnight-v12"/);
  for (const id of ['mic', 'stop-voice', 'stop-response', 'composer', 'prompt']) {
    assert.ok(jarvis.includes('id="' + id + '"'), 'missing Jarvis control: ' + id);
  }
  assert.match(jarvis, /\.shell\{background:var\(--bg\)!important\}/);
});
