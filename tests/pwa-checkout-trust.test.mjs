import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const desktop = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../roblox-studio.html', import.meta.url), 'utf8');
const returns = ['thank-you.html','business-thank-you.html','website-audit-thank-you.html','ai-receptionist-thank-you.html']
  .map((name) => [name, readFileSync(new URL('../' + name, import.meta.url), 'utf8')]);

test('landing PWA assets use the same real asset directory as the manifest', () => {
  assert.match(index, /href="\/lib\/assets\/pwa\/favicon\.svg"/);
  assert.match(index, /href="\/lib\/assets\/pwa\/icon-192\.png"/);
  assert.match(index, /href="\/lib\/assets\/pwa\/splash-iphone\.png"/);
  assert.doesNotMatch(index, /href="\/(?:icon-\d+\.png|splash-(?:iphone|ipad)[^"]*\.png|favicon\.svg)"/);
  for (const icon of manifest.icons || []) assert.match(icon.src, /^\/lib\/assets\/pwa\//);
});

test('public agent pages expose canonical metadata and sitemap entries', () => {
  assert.match(desktop, /rel="canonical" href="https:\/\/trystellarai\.com\/desktop"/);
  assert.match(studio, /rel="canonical" href="https:\/\/trystellarai\.com\/roblox-studio"/);
  for (const path of ['/install','/desktop','/roblox-studio']) {
    assert.ok(sitemap.includes('<loc>https://trystellarai.com' + path + '</loc>'), path);
  }
});

test('checkout-return pages are noindex and do not treat a direct page load as payment proof', () => {
  for (const [name, html] of returns) {
    assert.match(html, /<meta name="robots" content="noindex,nofollow">/, name);
    assert.match(html, /Stripe receipt/, name);
    assert.doesNotMatch(html, /<span class="(?:pill|tag)">(?:Payment received|Business payment received|Audit payment received|AI Receptionist paid)<\/span>/, name);
  }
});
