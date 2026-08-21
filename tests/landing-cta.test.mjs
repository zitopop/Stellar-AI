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
  for (const id of ['faq-test', 'faq-fivem-security', 'faq-frameworks', 'faq-generic-ai', 'faq-fix', 'faq-cancel']) {
    assert.match(landingHtml, new RegExp(`<button(?: type="button")? id="${id}-button" class="faq-button" aria-expanded="false" aria-controls="${id}-answer">`));
    assert.match(landingHtml, new RegExp(`<div id="${id}-answer" class="faq-answer" role="region" aria-labelledby="${id}-button" aria-hidden="true">`));
  }
  assert.match(landingHtml, /openItem\.querySelector\('\.faq-button'\)\.setAttribute\('aria-expanded', 'false'\)/);
});

test('Task 129 keeps FAQ answer accessibility visibility synchronized with disclosure state', () => {
  for (const id of ['faq-test', 'faq-fivem-security', 'faq-frameworks', 'faq-generic-ai', 'faq-fix', 'faq-cancel']) {
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
  assert.equal(icons.length, 6);
  assert.match(landingHtml, /\.faq-button\[aria-expanded="true"\] \.faq-plus/);
});

test('Task 132 keeps FAQ structured data aligned with additional visible landing-page answers', () => {
  assert.match(landingHtml, /"@type":"FAQPage"/);
  assert.match(landingHtml, /"name":"How should I test a generated script\?"/);
  assert.match(landingHtml, /"name":"How is this different from generic AI chat\?"/);
  assert.match(landingHtml, /<button(?: type="button")? id="faq-test-button"/);
  assert.match(landingHtml, /<button(?: type="button")? id="faq-generic-ai-button"/);
});

test('Task 162 keeps the FiveM server-validation FAQ visible and aligned with structured data', () => {
  assert.match(landingHtml, /"name":"How should I keep FiveM script events secure\?"/);
  assert.match(landingHtml, /validate the player's server-side state, permissions, inventory and relevant position/);
  assert.match(landingHtml, /<button type="button" id="faq-fivem-security-button" class="faq-button" aria-expanded="false" aria-controls="faq-fivem-security-answer">How should I keep FiveM script events secure\?/);
  assert.match(landingHtml, /<div id="faq-fivem-security-answer" class="faq-answer" role="region" aria-labelledby="faq-fivem-security-button" aria-hidden="true"><p>Treat client input as untrusted\./);
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

test('Task 158 keeps existing saved-tool actions touch-safe on every viewport', () => {
  assert.match(landingHtml, /\.favorite-star \{ display: inline-grid; flex: none; width: 44px; height: 44px; place-items: center; border: 1px solid var\(--border\); border-radius: 12px;/);
  assert.doesNotMatch(landingHtml, /\.favorite-star \{ display: inline-grid; flex: none; width: 30px;/);
});

test('Task 163 adds truthful private-testing guidance beside the FiveM Police starter', () => {
  assert.match(landingHtml, /<small class="launch-note">Before you test: review the files, verify dependencies, test privately, and return with any errors\.<\/small>/);
  assert.match(landingHtml, /\.launch-note \{ display: block; max-width: 25rem; margin-top: 5px; color: #b9b1c8; font-size: 8px; font-weight: 600; line-height: 1\.45; \}/);
  assert.match(landingHtml, /body\.light \.launch-card \.launch-note \{ color: #6d647e; \}/);
});

test('Task 182 keeps every landing FAQ disclosure control an explicit non-submit button', () => {
  for (const id of ['faq-test', 'faq-fivem-security', 'faq-frameworks', 'faq-generic-ai', 'faq-fix', 'faq-cancel']) {
    assert.match(landingHtml, new RegExp(`<button type="button" id="${id}-button" class="faq-button" aria-expanded="false" aria-controls="${id}-answer">`));
    assert.doesNotMatch(landingHtml, new RegExp(`<button id="${id}-button" class="faq-button"`));
  }
  assert.match(landingHtml, /openItem\.querySelector\('\.faq-button'\)\.setAttribute\('aria-expanded', 'false'\)/);
  assert.match(landingHtml, /button\.setAttribute\('aria-expanded', 'true'\)/);
});

test('Task 183 keeps the mobile landing navigation keyboard-accessible and destination-stable', () => {
  assert.match(landingHtml, /<button type="button" class="nav-toggle" id="nav-toggle" aria-label="Open navigation menu" aria-controls="mobile-nav" aria-expanded="false">/);
  assert.match(landingHtml, /<div class="mobile-nav" id="mobile-nav" aria-hidden="true"><div class="mobile-nav-inner container"><a href="#how-it-works">How it works<\/a><a href="#why-stellar">Why Stellar<\/a><a href="#capabilities">Capabilities<\/a><a href="#jarvis-pro">Jarvis Pro<\/a><a href="#plans">Pricing<\/a><a href="#roblox-worlds">Roblox worlds<\/a><a href="\/blog">Guides<\/a><a href="\/terms\.html">Terms<\/a><\/div><\/div>/);
  assert.match(landingHtml, /navToggle\?\.addEventListener\('click', \(\) => \{ const open = navToggle\.getAttribute\('aria-expanded'\) === 'true';/);
  assert.match(landingHtml, /mobileNav\?\.querySelectorAll\('a'\)\.forEach\(\(link\) => link\.addEventListener\('click', closeMobileNav\)\)/);
  assert.match(landingHtml, /\.nav-toggle \{ display: none; min-width: 44px; min-height: 44px;/);
  assert.match(landingHtml, /\.nav-toggle \{ display: inline-grid; place-items: center; \}/);
});

test('Task 184/190 keeps the framework rail close to the hero without removing the mobile spacing override', () => {
  assert.match(landingHtml, /\.framework-rail \{ display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 23px 28px; margin-top: 16px;/);
  assert.match(landingHtml, /\.framework-rail \{ display: block; padding: 19px; margin-top: 42px; \}/);
});

test('Task 186 keeps landing hash navigation visible beneath the sticky header', () => {
  assert.match(landingHtml, /html \{ overflow-x: hidden; scroll-padding-top: 96px; \}/);
  assert.match(landingHtml, /\[id="how-it-works"\], \[id="why-stellar"\], \[id="capabilities"\], \[id="plans"\], \[id="roblox-worlds"\] \{ scroll-margin-top: 96px; \}/);
  assert.match(landingHtml, /const revealHashTarget = \(hash, behavior = 'smooth'\) => \{/);
  assert.match(landingHtml, /target\.querySelectorAll\('\.reveal'\)\.forEach\(\(element\) => element\.classList\.add\('is-visible'\)\)/);
  assert.match(landingHtml, /history\.pushState\(null, '', hash\);/);
  assert.match(landingHtml, /closeMobileNav\(\);\n      history\.pushState/);
  assert.match(landingHtml, /window\.addEventListener\('hashchange', \(\) => revealHashTarget\(window\.location\.hash\)\)/);
});

test('Task 187 keeps plan positioning truthful and pricing consistent', () => {
  assert.match(landingHtml, /<div class="plan-decider" aria-label="How to choose a Stellar AI plan">[\s\S]*Plus adds more room for regular work\.[\s\S]*Pro gives you the largest usage allowance and Nova\./);
  assert.match(landingHtml, /<p class="plan-compare">Start with Free and upgrade when your workflow needs more usage\.[\s\S]*one-off credit instead of subscribing\.<\/p>/);
  assert.match(landingHtml, /<article class="plan"><div class="plan-badge">For regular building<\/div><div class="plan-label">Plus<\/div>/);
  assert.doesNotMatch(landingHtml, /<div class="plan-badge">Most popular<\/div>/);
  assert.match(landingHtml, /<article class="plan featured jarvis-plan"><div class="plan-badge">Jarvis Pro · for serious workflows<\/div>/);
  assert.match(landingHtml, /<strong>£20<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£75<\/strong><span>\/ month<\/span>/);
});

test('Task 188 keeps Roblox games and groups visible with approved destinations', () => {
  assert.match(landingHtml, /<div class="roblox-directory" aria-label="Stellar Roblox games and groups">[\s\S]*Roblox games &amp; groups[\s\S]*Stellar Strike[\s\S]*Stellar Simulator[\s\S]*StellarHQ[\s\S]*zitos gang[\s\S]*<\/div>/);
  assert.match(landingHtml, /querySelectorAll\('\.framework-rail, \.launch-deck, \.section-heading, \.capability, \.scenario, \.capability-map, \.why-stellar-section, \.plans, \.faq-layout, \.final-cta'\)/);
  assert.doesNotMatch(landingHtml, /querySelectorAll\('\.framework-rail, \.launch-deck, \.section-heading, \.capability, \.scenario, \.roblox-worlds, \.plans/);
  assert.match(landingHtml, /games\/103753262214310\/Stellar-Strike/);
  assert.match(landingHtml, /games\/17874928076\/Stellar-Simulator/);
  assert.match(landingHtml, /communities\/433084698\/StellarHQ/);
  assert.match(landingHtml, /communities\/222055052\/zitos-gang/);
});

test('Task 189 keeps Roblox destinations explicitly labelled for assistive technology', () => {
  assert.match(landingHtml, /games\/103753262214310\/Stellar-Strike[^>]*aria-label="Open Stellar Strike on Roblox"/);
  assert.match(landingHtml, /games\/17874928076\/Stellar-Simulator[^>]*aria-label="Open Stellar Simulator on Roblox"/);
  assert.match(landingHtml, /communities\/433084698\/StellarHQ[^>]*aria-label="Open the StellarHQ Roblox community"/);
  assert.match(landingHtml, /communities\/222055052\/zitos-gang[^>]*aria-label="Open the zitos gang Roblox community"/);
});

test('Task 190 keeps the landing hero-to-framework spacing compact without changing mobile spacing', () => {
  assert.match(landingHtml, /\.hero \{ position: relative; padding: 84px 0 24px; \}/);
  assert.match(landingHtml, /\.framework-rail \{ display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 23px 28px; margin-top: 16px;/);
  assert.match(landingHtml, /\.framework-rail \{ display: block; padding: 19px; margin-top: 42px; \}/);
  assert.match(landingHtml, /Police job/);
  assert.match(landingHtml, /Heist system/);
  assert.match(landingHtml, /Fix an error/);
  assert.match(landingHtml, /Roblox game/);
});

test('Task 191 keeps landing section rhythm compact across breakpoints', () => {
  assert.match(landingHtml, /\.section \{ padding: 76px 0; \}/);
  assert.match(landingHtml, /\.pricing-wrap \{ position: relative; overflow: hidden; padding: 60px 0 68px;/);
  assert.match(landingHtml, /\.final-cta \{ position: relative; overflow: hidden; padding: 58px 28px;/);
  assert.match(landingHtml, /\.section \{ padding: 56px 0; \}/);
  assert.match(landingHtml, /\.pricing-wrap \{ padding: 52px 0 58px; \}/);
  assert.match(landingHtml, /\.final-cta \{ padding: 55px 20px; \}/);
});


test('Task 192 gives visitors a useful, truthful Why Stellar AI comparison instead of an empty section', () => {
  assert.match(landingHtml, /<section class="section container why-stellar-section" id="why-stellar">/);
  assert.match(landingHtml, /<div class="eyebrow">Why Stellar AI<\/div><h2>Less generic chat\. More room to build\.<\/h2>/);
  assert.match(landingHtml, /browser workspace for turning a FiveM or Roblox idea into a clearer plan, a complete set of files and a next step you can test/);
  assert.match(landingHtml, /We do not promise that generated code removes the need for testing/);
  assert.match(landingHtml, /<a class="text-link" href="\/app">Open the workspace/);
  for (const heading of ['Built for FiveM and Roblox workflows', 'Plan before the code gets long', 'Keep the whole resource together', 'Fix, explain and iterate in the same place', 'Start free, then choose your runway']) {
    assert.match(landingHtml, new RegExp(`<h3>${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}<\\/h3>`));
  }
  assert.match(landingHtml, /\.why-stellar-section \{ padding-top: 52px; padding-bottom: 52px; \}/);
  assert.match(landingHtml, /\.why-stellar-section \{ padding-top: 36px; padding-bottom: 36px; \}/);
});


test('Task 193 exposes Why Stellar, Pricing, and Terms as direct landing destinations', () => {
  assert.match(landingHtml, /<a href="#why-stellar">Why Stellar<\/a>/);
  assert.match(landingHtml, /<a href="#plans">Pricing<\/a>/);
  assert.match(landingHtml, /<a href="\/terms\.html">Terms<\/a>/);
  assert.match(landingHtml, /why-stellar-section/);
  assert.match(landingHtml, /why-stellar-section, \.plans/);
});


test('Task 194 exposes the expanded truthful capability map for FiveM and Roblox builders', () => {
  assert.match(landingHtml, /<section class="section container" id="capabilities">/);
  assert.match(landingHtml, /Everything in one build loop/);
  assert.match(landingHtml, /QBCore, ESX, ox_lib and standalone context/);
  assert.match(landingHtml, /DataStores, GUIs, RemoteEvents and progression/);
  assert.match(landingHtml, /Plan a feature before generating a larger implementation/);
  assert.match(landingHtml, /does not claim to have installed, run, published or verified/);
  assert.match(landingHtml, /<a href="#capabilities">Capabilities<\/a>/);
});


test('Task 195 makes the hero follow-up useful with visible build paths', () => {
  assert.match(landingHtml, /<div class="hero-capabilities" aria-label="What Stellar AI can help you build">/);
  assert.match(landingHtml, /FiveM resources/);
  assert.match(landingHtml, /Roblox systems/);
  assert.match(landingHtml, /Fix broken code/);
  assert.match(landingHtml, /href="#capabilities"><b>Explore capabilities/);
  assert.match(landingHtml, /\.hero-capabilities \{ display: grid;/);
});


test('Task 196 keeps introductory and revealed landing content visible if animation setup is delayed', () => {
  assert.match(landingHtml, /\.reveal \{ opacity: 1; transform: translateY\(18px\);/);
  assert.match(landingHtml, /body\.motion-ready \.reveal \{ opacity: 1; \}/);
  assert.match(landingHtml, /\.reveal\.is-visible \{ opacity: 1; transform: none; \}/);
});

test('Task 192 makes Jarvis Pro visible and approval-first on desktop and mobile', () => {
  assert.match(landingHtml, /<a href="#jarvis-pro">Jarvis Pro<\/a>/g);
  assert.match(landingHtml, /<section class="section container" id="jarvis-pro">[\s\S]*Jarvis Pro · approval-first workspace[\s\S]*Explore Jarvis Pro/);
  assert.match(landingHtml, /Purchases, ad publishing and budget changes require confirmation\./);
  assert.match(landingHtml, /it does not silently purchase, publish or spend money\./);
});

test('Task 192 explains the plan choices without changing the approved prices', () => {
  assert.match(landingHtml, /Turn a first idea or broken script into a useful starting point\./);
  assert.match(landingHtml, /Keep regular FiveM or Roblox work moving without running out of room as quickly\./);
  assert.match(landingHtml, /The largest build runway plus the clearest path into Jarvis Pro workflows\./);
  assert.match(landingHtml, /<strong>£0<\/strong><span>\/ forever<\/span>/);
  assert.match(landingHtml, /<strong>£20<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£75<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /£168\/year · Save 30%/);
  assert.match(landingHtml, /£630\/year · Save 30%/);
});
