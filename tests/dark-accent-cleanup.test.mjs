import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('dark app shell removes the legacy old accent edge accent', () => {
  assert.match(appHtml, /body:not\(\.light\) #main-col \{[\s\S]*?background: #0b0d11 !important;[\s\S]*?border-left: 0 !important;[\s\S]*?outline: 0 !important;/);
  assert.match(appHtml, /body:not\(\.light\) \.sidebar-item\.active \{[\s\S]*?border-left-color: #F2D675 !important;/);
});

test('active dark workspace accents use black and gold styling', () => {
  assert.match(appHtml, /Final black-gold palette: no blue or gold active accents/);
  assert.match(appHtml, /body:not\(\.light\) #u-fill \{ background: linear-gradient\(90deg, #8f6b1e, #F2D675\) !important; \}/);
  assert.match(appHtml, /body:not\(\.light\) ::-webkit-scrollbar-thumb \{ background: rgba\(255,255,255,\.22\) !important; \}/);
});

test('strict dark UI removes blue and old accent active accents', () => {
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
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \.set-chev \{[\s\S]*?color: #f4d676 !important;/);
});


test('business palette lock uses the approved Stellar dark violet contract', async () => {
  const css = await readFile(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');
  assert.match(css, /Stellar Brand System v8/);
  assert.match(css, /--stellar-bg:#090b12/);
  assert.match(css, /--stellar-panel:#10131c/);
  assert.match(css, /--stellar-text:#f7f8fc/);
  assert.match(css, /--stellar-primary:#8b5cf6/);
  assert.match(css, /--stellar-cyan:#22d3ee/);
  assert.match(css, /--stellar-muted:#aab1c1/);
  assert.match(css, /--stellar-success:#22C55E/);
  assert.match(css, /--stellar-danger:#EF4444/);
  assert.match(appHtml, /stellar-business-palette\.css\?v=(?:1|8)/);
  assert.match(indexHtml, /stellar-business-palette\.css\?v=8/);
});

