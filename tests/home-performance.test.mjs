import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const orbit = await readFile(new URL('../assets/js/stellar-orbit.js', import.meta.url), 'utf8');
const growth = await readFile(new URL('../assets/js/stellar-growth-v1.js', import.meta.url), 'utf8');

test('home stays focused on four quick starts', () => {
  assert.equal((app.match(/class="sug-chip"/g) || []).length, 8);
  assert.equal((app.match(/class="home-guides-link"/g) || []).length, 2);
  assert.doesNotMatch(app, /class="roblox-world-links"/);
  assert.doesNotMatch(app, /class="welcome-next-step" role="note"/);
});

test('streaming response rendering is throttled instead of repainting every chunk', () => {
  assert.match(app, /const STREAM_RENDER_INTERVAL_MS = 50;/);
  assert.match(app, /scheduleStreamProgress\(\);/);
  assert.doesNotMatch(app, /const autoScroll = setInterval/);
  assert.match(app, /flushStreamProgress\(\);/);
});

test('background UI maintenance is event-driven and observer work is bounded', () => {
  assert.doesNotMatch(orbit, /setInterval\(syncAll,\s*2000\)/);
  assert.match(orbit, /setTimeout\(syncAll,\s*250\)/);
  assert.doesNotMatch(app, /observe\(document\.body, \{ subtree: true, attributes: true/);
  assert.match(app, /modalActivityObserver\.observe\(modal, \{ attributes: true, attributeFilter: \['class'\] \}\)/);
  assert.match(growth, /const setNodeText = \(node, value\)/);
  assert.match(growth, /usageFrame = requestAnimationFrame/);
  assert.match(growth, /projectFrame = requestAnimationFrame/);
});

test('wallet polling sleeps while the app is hidden or offline', () => {
  assert.match(app, /if \(document\.hidden \|\| navigator\.onLine === false\) return;/);
});

test('model picker observer cannot self-trigger an aria-checked mutation loop', () => {
  assert.match(growth, /if \(button\.getAttribute\('aria-checked'\) !== checked\) button\.setAttribute\('aria-checked', checked\);/);
  assert.match(growth, /records\.some\(\(record\) => record\.target\?\.matches\?\.\('\[data-model-choice\]'\)\)/);
  assert.doesNotMatch(growth, /new MutationObserver\(\(\) => syncReasoningControl\(\)\)/);
});
