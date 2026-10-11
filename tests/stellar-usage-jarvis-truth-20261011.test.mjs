import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('chat never advertises a fabricated full usage balance before plan verification', () => {
  const app = read('app.html');
  assert.match(app, /id="usagePill"[^>]*aria-label="Sign in to view usage"/);
  assert.match(app, /id="usageCount">Sign in<\/strong>/);
  assert.doesNotMatch(app, /Usage: 100% remaining/);
  assert.match(app, /planTruthStatus='pending'/);
  assert.match(app, /planTruthStatus='ready';updateHeader\(\)/);
  assert.match(app, /planTruthStatus='unavailable'/);
  assert.match(app, /planTruthStatus==='ready'\?fmt\(/);
  assert.match(app, /balance unavailable/);
  assert.match(app, /checking balance/);
});

test('Jarvis microphone activation needs deliberate hands-free opt-in per visit', () => {
  const jarvis = read('jarvis-workspace.html');
  assert.match(jarvis, /let handsFree = false;/);
  assert.doesNotMatch(jarvis, /let handsFree = safeStorageGet\('stellarJarvisHandsFree'/);
  assert.match(jarvis, /Hands-free is off on every new visit until you turn it on/);
  assert.match(jarvis, /id="handsfree-toggle"/);
  assert.match(jarvis, /id="stop-response"[^>]*hidden>■ Stop answer<\/button>/);
  assert.match(jarvis, /id="stop-voice"[^>]*hidden>■ Stop voice<\/button>/);
});

test('landing stays focused and preserves all four plan choices and Jarvis entry', () => {
  const home = read('index.html');
  assert.match(home, /<nav class="site-nav"[^>]*>/);
  assert.match(home, /<a href="\/jarvis">Jarvis<\/a>/);
  const plans = [...home.matchAll(/data-plan="(free|starter|plus|pro)"/g)].map(match => match[1]);
  assert.deepEqual(plans, ['free', 'starter', 'plus', 'pro']);
  assert.match(home, /data-cycle="annual"/);
  assert.match(home, /href="\/plans"/);
});
