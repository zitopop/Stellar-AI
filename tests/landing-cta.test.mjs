import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Task 123 keeps the primary hero CTA honest, free, and routed to the workspace', () => {
  assert.match(landingHtml, /<a href="\/app" class="button button-primary">Generate your first script free <span class="button-arrow">→<\/span><\/a>/);
  assert.match(landingHtml, /<div class="hero-footnote"><span>No card needed to begin<\/span><span>Free starting credit<\/span><span>Built for real project files<\/span><\/div>/);
});

test('Task 124 lets keyboard visitors skip the landing navigation and focus main content', () => {
  assert.match(landingHtml, /<a href="#main-content" class="skip-link">Skip to main content<\/a>/);
  assert.match(landingHtml, /<main id="main-content" tabindex="-1">/);
  assert.match(landingHtml, /\.skip-link \{[^}]*transform: translateY\(-160%\);[^}]*\}/);
  assert.match(landingHtml, /\.skip-link:focus-visible \{ transform: translateY\(0\); outline: 3px solid rgba\(105,229,193,\.92\); outline-offset: 3px; \}/);
});

test('Task 125 keeps the visible mobile landing theme control touch-safe', () => {
  assert.match(landingHtml, /@media \(max-width: 760px\) \{\s+\.container[\s\S]*?\.nav-cta \{ min-height: 37px; padding: 0 12px; \} \.theme-toggle \{ min-width: 44px; min-height: 44px; \}/);
});
