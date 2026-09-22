import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('dark app shell removes the legacy purple edge accent', () => {
  assert.match(appHtml, /body:not\(\.light\) #main-col \{[\s\S]*?background: #0b0d11 !important;[\s\S]*?border-left: 0 !important;[\s\S]*?outline: 0 !important;/);
  assert.match(appHtml, /body:not\(\.light\) \.sidebar-item\.active \{[\s\S]*?border-left-color: #61e6bf !important;/);
});

test('active dark workspace accents use black and gold styling', () => {
  assert.match(appHtml, /Final black-gold palette: no blue or gold active accents/);
  assert.match(appHtml, /body:not\(\.light\) #u-fill \{ background: linear-gradient\(90deg, #087d60, #d4af37\) !important; \}/);
  assert.match(appHtml, /body:not\(\.light\) ::-webkit-scrollbar-thumb \{ background: rgba\(255,255,255,\.22\) !important; \}/);
});

test('strict dark UI removes blue and purple active accents', () => {
  assert.match(appHtml, /Strict monochrome dark UI: keep all website chrome black, grey, and white/);
  assert.match(appHtml, /body:not\(\.light\) #u-fill,\s+body:not\(\.light\) #u-fill\.unlimited \{ background: #d7d9de !important; \}/);
  assert.match(appHtml, /body:not\(\.light\) \.sug-chip > span:first-child \{ filter: grayscale\(1\) saturate\(0\) !important; \}/);
});

test('homepage uses a dedicated dark theme without legacy override passes', async () => {
  const css = await readFile(new URL('../lib/assets/homepage.css', import.meta.url), 'utf8');
  assert.match(indexHtml, /href="\/lib\/assets\/homepage\.css\?v=/);
  assert.match(css, /color-scheme:\s*dark/);
  assert.doesNotMatch(indexHtml, /<style|stellar-premium\.css/);
});

test('dark Settings terms link has no browser-blue underline', () => {
  assert.match(appHtml, /body:not\(\.light\) #settings-modal \.set-item,\s+body:not\(\.light\) #settings-modal \.set-item a,[\s\S]*?text-decoration: none !important;/);
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \{[\s\S]*?color: #e7eaf0 !important;[\s\S]*?text-decoration: none !important;/);
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \.set-chev \{[\s\S]*?color: #8fe8cf !important;/);
});
