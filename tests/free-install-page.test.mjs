import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../install.html', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('free install page supports browser-native PWA installation', () => {
  assert.match(html, /rel="manifest" href="\/manifest\.json"/);
  assert.match(html, /beforeinstallprompt/);
  assert.match(html, /appinstalled/);
  assert.match(html, /navigator\.serviceWorker\.register\('\/sw\.js'\)/);
  assert.match(html, /display-mode: standalone/);
});

test('free install page gives explicit iPhone and Android paths', () => {
  assert.match(html, /Safari → Share → Add to Home Screen → Open as Web App → Add/);
  assert.match(html, /Install app or Add to Home screen/);
  assert.match(html, /No Apple developer fee for this route/);
  assert.match(html, /No Google Play developer fee for this route/);
  assert.match(html, /it does not place Stellar in Apple’s App Store or Google Play/);
});

test('install route is public and discoverable from the landing page', () => {
  assert.ok(vercel.rewrites.some((route) => route.source === '/install' && route.destination === '/install.html'));
  assert.match(landing, /href="\/install">Install app<\/a>/);
});
