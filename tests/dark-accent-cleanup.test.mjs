import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('dark app shell removes the legacy purple edge accent', () => {
  assert.match(appHtml, /body:not\(\.light\) #main-col \{[\s\S]*?background: #0b0d11 !important;[\s\S]*?border-left: 0 !important;[\s\S]*?outline: 0 !important;/);
  assert.match(appHtml, /body:not\(\.light\) \.sidebar-item\.active \{[\s\S]*?border-left-color: #61e6bf !important;/);
});

test('active dark workspace accents use neutral and emerald styling', () => {
  assert.match(appHtml, /Final dark palette: no blue or purple active accents/);
  assert.match(appHtml, /body:not\(\.light\) #u-fill \{ background: linear-gradient\(90deg, #087d60, #10a37f\) !important; \}/);
  assert.match(appHtml, /body:not\(\.light\) ::-webkit-scrollbar-thumb \{ background: rgba\(255,255,255,\.22\) !important; \}/);
});

test('strict dark UI removes blue and purple active accents', () => {
  assert.match(appHtml, /Strict monochrome dark UI: keep all website chrome black, grey, and white/);
  assert.match(appHtml, /body:not\(\.light\) #u-fill,\s+body:not\(\.light\) #u-fill\.unlimited \{ background: #d7d9de !important; \}/);
  assert.match(appHtml, /body:not\(\.light\) \.sug-chip > span:first-child \{ filter: grayscale\(1\) saturate\(0\) !important; \}/);
});

test('landing page removes colored section backgrounds in the final monochrome pass', () => {
  assert.match(indexHtml, /Final monochrome surface pass: remove blue\/cyan\/purple-tinted backgrounds/);
  assert.match(indexHtml, /body:not\(\.light\) \.pricing-wrap,[\s\S]*?background: #17191d !important;/);
  assert.match(indexHtml, /body:not\(\.light\) \.product-main \{[\s\S]*?background: #0f1115 !important;/);
  assert.match(indexHtml, /body:not\(\.light\) \.preview-nav\.active,[\s\S]*?background: #e5e7eb !important;/);
  assert.match(indexHtml, /body:not\(\.light\) \.roblox-game-mark \{[\s\S]*?background: #e5e7eb !important;/);
});

test('dark Settings terms link has no browser-blue underline', () => {
  assert.match(appHtml, /body:not\(\.light\) #settings-modal \.set-item,\s+body:not\(\.light\) #settings-modal \.set-item a,[\s\S]*?text-decoration: none !important;/);
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \{[\s\S]*?color: #e7eaf0 !important;[\s\S]*?text-decoration: none !important;/);
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \.set-chev \{[\s\S]*?color: #8fe8cf !important;/);
});
