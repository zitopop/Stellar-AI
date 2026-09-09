import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('landing has the requested phone, tablet and desktop breakpoint contract', () => {
  assert.match(html, /Responsive breakpoint contract: 640 \/ 900 \/ 1024\+/);
  assert.match(html, /@media \(max-width: 640px\) \{[\s\S]*?\.nav-links, \.nav-actions \{ display: none !important; \}[\s\S]*?\.hero-actions[\s\S]*?grid-template-columns: 1fr !important;[\s\S]*?\.capability-grid[\s\S]*?grid-template-columns: 1fr !important;/);
  assert.match(html, /@media \(min-width: 641px\) and \(max-width: 900px\) \{[\s\S]*?\.capability-grid[\s\S]*?repeat\(2, minmax\(0, 1fr\)\) !important;/);
  assert.match(html, /@media \(min-width: 1024px\) \{[\s\S]*?max-width: 1000px !important;[\s\S]*?\.capability-grid, \.plans, \.plan-decider \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important;[\s\S]*?\.capability-map-grid, \.roblox-grid, \.proof-strip, \.review-grid, \.comparison-points \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important;/);
});

test('landing includes narrow-screen overflow guards for 320px phones', () => {
  assert.match(html, /html, body \{ width: 100%; max-width: 100%; overflow-x: hidden; \}/);
  assert.match(html, /\.page-shell, main, section \{ max-width: 100%; overflow-x: clip; \}/);
  assert.match(html, /@media \(max-width: 640px\) \{[\s\S]*?\.container \{ width: min\(calc\(100% - 24px\), 100%\) !important; max-width: 100% !important; \}/);
});