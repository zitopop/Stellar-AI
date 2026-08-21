import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Task 123 keeps the primary hero CTA honest, free, and routed to the workspace', () => {
  assert.match(landingHtml, /<a href="\/app" class="button button-primary">Generate your first script free <span class="button-arrow">→<\/span><\/a>/);
  assert.match(landingHtml, /<div class="hero-footnote"><span>No card needed to begin<\/span><span>Free starting credit<\/span><span>Built for real project files<\/span><\/div>/);
});

test('Task 140 presents the landing workspace preview as one concise labelled visual', () => {
  assert.match(landingHtml, /<div class="product-frame" role="img" aria-label="Illustrated Stellar AI workspace preview showing a QBCore police resource plan, generated files, and a message composer">/);
  assert.match(landingHtml, /<div class="hero-depth-chip hero-depth-chip--top" aria-hidden="true">QBCore context<\/div>/);
  assert.match(landingHtml, /<div class="hero-depth-chip hero-depth-chip--bottom" aria-hidden="true">Roblox ready<\/div>/);
});

test('Task 141 keeps the phone-sized hero preview focused on its readable workspace pane', () => {
  assert.match(landingHtml, /\.hero-visual \.product-main \{ grid-template-columns: 1fr; \}/);
  assert.match(landingHtml, /\.hero-visual \.preview-side \{ display: none; \}/);
  assert.match(landingHtml, /<div class="preview-work">/);
  assert.match(landingHtml, /<div class="preview-compose"><div class="preview-input">Ask Stellar to change anything…<\/div><div class="preview-send">Send<\/div><\/div>/);
});

test('Task 144 gives each existing pricing action an explicit plan-oriented name', () => {
  assert.match(landingHtml, /<a href="\/app" class="button button-secondary" aria-label="Start with the Free plan">Start free<\/a>/);
  assert.match(landingHtml, /<a href="\/app" class="button button-primary" aria-label="Choose the Plus plan">Get Plus <span class="button-arrow">→<\/span><\/a>/);
  assert.match(landingHtml, /<a href="\/app" class="button button-secondary" aria-label="Choose the Pro plan">Get Pro<\/a>/);
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

test('Task 126 exposes unsaved favorite-tool buttons as unpressed before the existing state renderer runs', () => {
  for (const id of ['police', 'heist', 'fix', 'roblox']) {
    assert.match(landingHtml, new RegExp(`data-favorite="${id}" aria-label="Save [^"]+" aria-pressed="false"`));
  }
  assert.match(landingHtml, /button\.setAttribute\('aria-pressed', String\(active\)\);/);
});

test('Task 127 announces existing feature-search result-count updates politely', () => {
  assert.match(landingHtml, /<span class="feature-count" id="feature-count" role="status" aria-live="polite" aria-atomic="true">4 tools<\/span>/);
  assert.match(landingHtml, /if \(count\) count\.textContent = `\$\{visible\} \$\{visible === 1 \? 'tool' : 'tools'\}`;/);
});

test('Task 128 links every FAQ disclosure control with its labelled answer region', () => {
  for (const id of ['faq-test', 'faq-frameworks', 'faq-generic-ai', 'faq-fix', 'faq-cancel']) {
    assert.match(landingHtml, new RegExp(`<button id="${id}-button" class="faq-button" aria-expanded="false" aria-controls="${id}-answer">`));
    assert.match(landingHtml, new RegExp(`<div id="${id}-answer" class="faq-answer" role="region" aria-labelledby="${id}-button" aria-hidden="true">`));
  }
  assert.match(landingHtml, /openItem\.querySelector\('\.faq-button'\)\.setAttribute\('aria-expanded', 'false'\)/);
});

test('Task 129 keeps FAQ answer accessibility visibility synchronized with disclosure state', () => {
  for (const id of ['faq-test', 'faq-frameworks', 'faq-generic-ai', 'faq-fix', 'faq-cancel']) {
    assert.match(landingHtml, new RegExp(`<div id="${id}-answer" class="faq-answer" role="region" aria-labelledby="${id}-button" aria-hidden="true">`));
  }
  assert.match(landingHtml, /openItem\.querySelector\('\.faq-answer'\)\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(landingHtml, /item\.querySelector\('\.faq-answer'\)\.setAttribute\('aria-hidden', 'false'\)/);
});

test('Task 130 announces existing saved-tool count updates politely', () => {
  assert.match(landingHtml, /<span id="favorite-count" role="status" aria-live="polite" aria-atomic="true">0 saved<\/span>/);
  assert.match(landingHtml, /if \(favoriteCount\) favoriteCount\.textContent = `\$\{favorites\.length\} saved`;/);
});

test('Task 131 keeps decorative FAQ plus icons out of control names', () => {
  const icons = landingHtml.match(/<span class="faq-plus" aria-hidden="true">\+<\/span>/g) ?? [];
  assert.equal(icons.length, 5);
  assert.match(landingHtml, /\.faq-button\[aria-expanded="true"\] \.faq-plus/);
});

test('Task 132 keeps FAQ structured data aligned with additional visible landing-page answers', () => {
  assert.match(landingHtml, /"@type":"FAQPage"/);
  assert.match(landingHtml, /"name":"How should I test a generated script\?"/);
  assert.match(landingHtml, /"name":"How is this different from generic AI chat\?"/);
  assert.match(landingHtml, /<button id="faq-test-button"/);
  assert.match(landingHtml, /<button id="faq-generic-ai-button"/);
});

test('Task 147 gives the final free-generation action an explicit accessible name', () => {
  assert.match(landingHtml, /<a href="\/app" class="button button-primary" aria-label="Generate your first Stellar AI script free">Generate your first script free <span class="button-arrow">→<\/span><\/a>/);
});

test('Task 154 sends each existing project quick start into the workspace with only a named starter key', () => {
  const starters = {
    police: 'Police job',
    heist: 'Heist system',
    fix: 'Fix an error',
    roblox: 'Roblox game'
  };
  for (const [key, label] of Object.entries(starters)) {
    assert.match(landingHtml, new RegExp(`<a href="/app\\?starter=${key}" aria-label="Open Stellar with a ${label} starter prompt">`));
  }
});

test('Task 156 adds a concise, honest Guides-hub route beside existing quick starts', () => {
  assert.match(landingHtml, /<p class="launch-guides">Need a walkthrough first\? <a href="\/blog">Browse FiveM &amp; Roblox guides <span aria-hidden="true">→<\/span><\/a><\/p>/);
  assert.match(landingHtml, /\.launch-guides \{ display: flex; align-items: center; flex-wrap: wrap;/);
  assert.match(landingHtml, /body\.light \.launch-guides a \{ color: #5b36aa;/);
});

test('Task 157 keeps existing quick-start card content readable in light theme', () => {
  assert.match(landingHtml, /body\.light \.launch-card \{ border-color: rgba\(84,67,128,\.16\); background: rgba\(255,255,255,\.86\); \}/);
  assert.match(landingHtml, /body\.light \.launch-card strong \{ color: #211a35; \} body\.light \.launch-card span \{ color: #625b75; \}/);
});
