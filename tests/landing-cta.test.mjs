import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Task 199 keeps the direct hero explanation and primary CTA honest, free, and routed to the workspace', () => {
  assert.match(landingHtml, /<h1>From game idea to complete files — <span class="gradient-text">for FiveM &amp; Roblox\.<\/span><\/h1>/);
  assert.match(landingHtml, /<p class="hero-lead">Tell Stellar what you want to build\. It plans the system, writes the files, explains what changed and stays with the next revision for QBCore, ESX and Roblox\.<\/p>/);
  assert.match(landingHtml, /<a href="\/app\?welcome=1" class="button button-primary">Generate your first script free <span class="button-arrow">→<\/span><\/a>/);
  assert.match(landingHtml, /<a href="#how-it-works" class="button button-secondary">See the 4-step workflow<\/a>/);
  assert.match(landingHtml, /<div class="hero-footnote"><span>No card needed to begin<\/span><span>Free starting credit<\/span><span>Review and test every script<\/span><\/div>/);
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

test('Task 200 keeps each quick start as one direct, uncluttered workspace route', () => {
  for (const [key, label] of Object.entries({ police: 'Police job', heist: 'Heist system', fix: 'Fix an error', roblox: 'Roblox game' })) {
    assert.match(landingHtml, new RegExp(`<a class="launch-card" href="/app\\?starter=${key}" aria-label="Open Stellar with a ${label} starter prompt">`));
  }
  assert.doesNotMatch(landingHtml, /data-favorite|favorite-star/);
});

test('Task 200 removes the redundant on-page tool search rather than displaying an empty first-visit state', () => {
  assert.doesNotMatch(landingHtml, /feature-search|feature-empty|Find a starting point|No matching tools yet/);
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

test('Task 200 removes the empty saved-tools surface and its unused browser-storage behavior', () => {
  assert.doesNotMatch(landingHtml, /favorite-section|favorite-grid|stellar-favorite-tools|renderFavorites/);
});

test('Task 131 keeps decorative FAQ plus icons out of control names', () => {
  const icons = landingHtml.match(/<span class="faq-plus" aria-hidden="true">\+<\/span>/g) ?? [];
  assert.equal(icons.length, 8);
  assert.match(landingHtml, /\.faq-button\[aria-expanded="true"\] \.faq-plus/);
  assert.match(landingHtml, /id="faq-free-button"[\s\S]*id="faq-free-answer"/);
  assert.match(landingHtml, /id="faq-files-button"[\s\S]*id="faq-files-answer"/);
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
    assert.match(landingHtml, new RegExp(`<a class="launch-card" href="/app\\?starter=${key}" aria-label="Open Stellar with a ${label} starter prompt">`));
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

test('Task 200 avoids nested quick-start controls while retaining a complete card-sized route', () => {
  assert.match(landingHtml, /\.launch-card \{ display: flex; min-height: 76px; align-items: center; gap: 10px; padding: 11px;/);
  assert.doesNotMatch(landingHtml, /<div class="launch-card"/);
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
  assert.match(landingHtml, /<div class="mobile-nav" id="mobile-nav" aria-hidden="true"><div class="mobile-nav-inner container"><a href="#how-it-works">How it works<\/a><a href="#why-stellar">Why Stellar<\/a><a href="#capabilities">Capabilities<\/a><a href="#plans">Pricing<\/a><a href="#roblox-worlds">Roblox worlds<\/a><a href="\/blog">Guides<\/a><a href="\/terms\.html">Terms<\/a><\/div><\/div>/);
  assert.match(landingHtml, /navToggle\?\.addEventListener\('click', \(\) => \{ const open = navToggle\.getAttribute\('aria-expanded'\) === 'true';/);
  assert.match(landingHtml, /mobileNav\?\.querySelectorAll\('a'\)\.forEach\(\(link\) => link\.addEventListener\('click', closeMobileNav\)\)/);
  assert.match(landingHtml, /\.nav-toggle \{ display: none; min-width: 44px; min-height: 44px;/);
  assert.match(landingHtml, /\.nav-toggle \{ display: inline-grid; place-items: center; \}/);
});

test('Task 184/190 keeps the framework rail close to the hero without removing the mobile spacing override', () => {
  assert.match(landingHtml, /\.framework-rail \{ display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 23px 28px; margin-top: 16px;/);
  assert.match(landingHtml, /\.framework-rail \{ display: block; padding: 19px; margin-top: 42px; \}/);
});

test('landing cards use neutral white and grey hover feedback', () => {
  assert.match(landingHtml, /:root \{ --review-card: #181818; --review-card-hover: #222222; --review-border: #343434; --review-border-hover: #a1a1aa; \}/);
  assert.match(landingHtml, /\.hero-capability:hover, \.launch-card:hover, \.capability:hover, \.capability-map-card:hover, \.difference-item:hover, \.proof-card:hover, \.plan:hover, \.faq-item:hover, \.roblox-card:hover \{ transform: translateY\(-2px\) !important; border-color: var\(--review-border-hover\) !important; background: var\(--review-card-hover\) !important;/);
  assert.match(landingHtml, /body\.light \.hero-capability:hover, body\.light \.launch-card:hover, body\.light \.capability:hover, body\.light \.capability-map-card:hover, body\.light \.difference-item:hover, body\.light \.proof-card:hover, body\.light \.plan:hover, body\.light \.faq-item:hover, body\.light \.roblox-card:hover \{ border-color: #71717a !important; background: #f4f4f5 !important;/);
});

test('landing page stays explicit and consistent with the dark-only theme without a visible theme label', () => {
  assert.doesNotMatch(landingHtml, /<span class="theme-status" aria-label="Dark mode only">☾ Dark only<\/span>/);
  assert.doesNotMatch(landingHtml, /LIGHT_THEME_START_HOUR|DARK_THEME_START_HOUR|automaticTheme\(/);
  assert.doesNotMatch(landingHtml, /Manual override active; automatic schedule resumes at the next hour\./);
});

test('the landing navigation remains sticky across viewport sizes', () => {
  assert.match(landingHtml, /\.site-header \{ position: -webkit-sticky; position: sticky; inset-block-start: 0; z-index: 30; width: 100%;/);
  assert.match(landingHtml, /<header class="site-header">/);
});

test('the landing header has a final iPhone-safe stacking and inset guard', () => {
  assert.match(landingHtml, /\.site-header \{\s+position: -webkit-sticky !important;\s+position: sticky !important;\s+top: 0 !important;\s+z-index: 1000 !important;/);
  assert.match(landingHtml, /width: 100%;\s+padding-top: env\(safe-area-inset-top\) !important;/);
  assert.match(landingHtml, /\.site-header > \.nav \{\s+position: relative;\s+z-index: 1001;/);
  assert.match(landingHtml, /\.site-header::before \{[\s\S]*?inset: 0;[\s\S]*?pointer-events: none;/);
  assert.match(landingHtml, /\.site-header > \.nav \{\s+min-height: 58px !important;\s+padding-top: 12px !important;/);
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

test('landing pricing cards stay scannable without removing commercial facts', () => {
  assert.match(landingHtml, /\.plan-fit \{ display: none !important; \}/);
  for (const price of ['£0', '£8', '£20', '£75', '£67\/year', '£168\/year', '£630\/year']) assert.match(landingHtml, new RegExp(price));
  for (const cta of ['Start free', 'Get Starter', 'Get Plus', 'Get Pro']) assert.match(landingHtml, new RegExp(cta));
});

test('Task 199 keeps plan positioning truthful, use-case-led, and pricing consistent', () => {
  assert.match(landingHtml, /<div class="plan-decider" aria-label="How to choose a Stellar AI plan">[\s\S]*Writing scripts most weeks\?[\s\S]*Starter gives you longer scripts and more breathing room\.[\s\S]*Plus is the practical middle for bigger weekly builds\.[\s\S]*Pro is for the large jobs where waiting gets old\./);
  assert.match(landingHtml, /<div class="section-heading center"><div class="eyebrow">Straightforward pricing<\/div><h2>Pay for the room you actually need\.<\/h2><p>Try the workflow for free\. Upgrade when your scripts get longer, your builds get bigger or you simply need more headroom\.<\/p><\/div>/);
  assert.match(landingHtml, /<p class="plan-compare">No credit maze\. No surprise tiers\.[\s\S]*freedom to cancel when you need to\.<\/p>/);
  assert.match(landingHtml, /<article class="plan"><div class="plan-label">Starter<\/div><h3>More room for regular scripts\.<\/h3><p class="plan-desc">For when Free is useful but you keep hitting the ceiling on normal builds\.<\/p>/);
  assert.match(landingHtml, /<strong>£8<\/strong><span>\/ month<\/span><\/div><a href="\/app" class="button button-secondary" aria-label="Choose the Starter plan">Get Starter<\/a><div class="annual">£67\/year · Save 30%<\/div><div class="plan-includes">Everything in Free, plus<\/div><ul><li>3× usage · 120 requests\/hour<\/li><li>Priority queue<\/li><li>Longer scripts<\/li><li>Cancel anytime<\/li><\/ul>/);
  assert.match(landingHtml, /<article class="plan featured"><div class="plan-badge">Most popular<\/div><div class="plan-label">Plus<\/div>/);
  assert.match(landingHtml, /<article class="plan"><div class="plan-badge">For complete games<\/div><div class="plan-label">Pro<\/div>/);
  assert.match(landingHtml, /<strong>£8<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£20<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£75<\/strong><span>\/ month<\/span>/);
});

test('Task 188 keeps Roblox games and groups visible with approved destinations', () => {
  assert.match(landingHtml, /<div class="roblox-directory" aria-label="Stellar Roblox games and groups">[\s\S]*Choose a world[\s\S]*Stellar Strike[\s\S]*Stellar Simulator[\s\S]*StellarHQ[\s\S]*zitos gang[\s\S]*<\/div>/);
  assert.match(landingHtml, /src="\/assets\/stellar-strike-thumb\.png"[^>]*alt="Stellar Strike lightning star thumbnail"/);
  assert.match(landingHtml, /src="\/assets\/stellar-simulator-thumb\.png"[^>]*alt="Stellar Simulator orbital planet thumbnail"/);
  assert.match(landingHtml, /Stellar Strike<\/h3><p><strong>Fast PvP rounds\.<\/strong>/);
  assert.match(landingHtml, /Stellar Simulator<\/h3><p><strong>Build, upgrade, repeat\.<\/strong>/);
  assert.match(landingHtml, /class="roblox-game-badge">Fast PvP action<\/span>/);
  assert.match(landingHtml, /class="roblox-game-badge">Collect &amp; upgrade<\/span>/);
  assert.match(landingHtml, /querySelectorAll\('\.framework-rail, \.launch-deck, \.section-heading, \.capability, \.scenario, \.capability-map, \.why-stellar-section, \.plans, \.faq-layout, \.final-cta'\)/);
  assert.doesNotMatch(landingHtml, /querySelectorAll\('\.framework-rail, \.launch-deck, \.section-heading, \.capability, \.scenario, \.roblox-worlds, \.plans/);
  assert.match(landingHtml, /games\/103753262214310\/Stellar-Strike/);
  assert.match(landingHtml, /games\/17874928076\/Stellar-Simulator/);
  assert.match(landingHtml, /communities\/433084698\/StellarHQ/);
  assert.match(landingHtml, /communities\/222055052\/zitos-gang/);
});

test('Task 189 keeps Roblox destinations explicitly labelled for assistive technology', () => {
  assert.match(landingHtml, /games\/103753262214310\/Stellar-Strike[^>]*aria-label="Play Stellar Strike on Roblox"/);
  assert.match(landingHtml, /games\/17874928076\/Stellar-Simulator[^>]*aria-label="Play Stellar Simulator on Roblox"/);
  assert.match(landingHtml, /communities\/433084698\/StellarHQ[^>]*aria-label="Open the StellarHQ Roblox community"/);
  assert.match(landingHtml, /communities\/222055052\/zitos-gang[^>]*aria-label="Open the zitos gang Roblox community"/);
});

test('landing page keeps only the essential visitor journey visible', () => {
  assert.match(landingHtml, /#proof-section, \.framework-rail, \.hero-capabilities, \.launch-deck \{ display: none !important; \}/);
  assert.match(landingHtml, /\.comparison-head > p, \.roblox-head > p, \.difference-note, \.pricing-note,/);
  for (const id of ['how-it-works', 'capabilities', 'roblox-worlds', 'why-stellar', 'comparison', 'plans']) assert.match(landingHtml, new RegExp(`id="${id}"`));
  for (const cta of ['Generate your first script free', 'Start free', 'Get Starter', 'Get Plus', 'Get Pro']) assert.match(landingHtml, new RegExp(cta));
});

test('landing responsive sizing keeps phone and iPad layouts balanced', () => {
  assert.match(landingHtml, /@media \(min-width: 761px\) and \(max-width: 1180px\) \{[\s\S]*?\.container \{ width: min\(calc\(100% - 56px\), 980px\); \}[\s\S]*?\.hero-grid \{ grid-template-columns: minmax\(0, \.94fr\) minmax\(0, 1\.06fr\);/);
  assert.match(landingHtml, /@media \(max-width: 760px\) \{[\s\S]*?\.hero-actions \{ display: grid; grid-template-columns: 1fr; gap: 8px; \}[\s\S]*?\.hero-actions \.button \{ width: 100%; min-height: 48px; \}/);
  assert.match(landingHtml, /@media \(max-width: 430px\) \{[\s\S]*?\.container \{ width: min\(calc\(100% - 24px\), 560px\); \}/);
});

test('landing polish keeps the first screen organised and hides only secondary repetition', () => {
  assert.match(landingHtml, /\.hero \{ padding-top: clamp\(72px, 9vw, 118px\); \}/);
  assert.match(landingHtml, /\.hero-copy h1 \{ max-width: 10\.5ch; line-height: \.98; \}/);
  assert.match(landingHtml, /\.proof-note, \.framework-copy, \.hero-capabilities-intro span, \.launch-deck-copy p,/);
  assert.match(landingHtml, /#how-it-works \.section-heading > p, #how-it-works \.workflow-note,/);
  assert.match(landingHtml, /#capabilities \.section-heading > p \{ display: none !important; \}/);
  assert.match(landingHtml, /From game idea to complete files/);
  for (const cta of ['Generate your first script free', 'See the 4-step workflow']) assert.match(landingHtml, new RegExp(cta));
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

test('Task 198 removes the unavailable Jarvis public presentation from landing, navigation, plans, and scripts', () => {
  assert.doesNotMatch(landingHtml, /Jarvis/i);
  assert.doesNotMatch(landingHtml, /jarvis-pro/i);
  assert.doesNotMatch(landingHtml, /jarvis-demo/i);
  assert.doesNotMatch(landingHtml, /shopping comparisons|ad publishing|approval-first/i);
});

test('Task 198 keeps current Pro positioning and approved plan prices after removing Jarvis', () => {
  assert.match(landingHtml, /Use it for a first build, a small feature or the bug that has been winding you up all evening\. No card, no sales pitch\./);
  assert.match(landingHtml, /The straightforward upgrade for early builders who are using Stellar regularly\./);
  assert.match(landingHtml, /The most room for complete games, complicated systems and projects that are too large for a quick experiment\./);
  assert.match(landingHtml, /Choose this when you need Nova and do not want your larger build squeezed into a smaller allowance\./);
  assert.match(landingHtml, /<strong>£0<\/strong><span>\/ forever<\/span>/);
  assert.match(landingHtml, /<strong>£8<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£20<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£75<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /£168\/year · Save 30%/);
  assert.match(landingHtml, /£630\/year · Save 30%/);
});

test('capability and improve cards use larger, scan-friendly dimensions', () => {
  assert.match(landingHtml, /\.capability-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 20px; \}/);
  assert.match(landingHtml, /\.capability \{ min-height: 420px; padding: 36px; \}/);
  assert.match(landingHtml, /\.capability h3 \{ max-width: 14ch; margin-top: 72px; font-size: 27px;/);
  assert.match(landingHtml, /\.capability p \{ max-width: 420px; font-size: 15px; line-height: 1\.72; \}/);
  assert.match(landingHtml, /\.capability-map-card \{ min-height: 340px; padding: 30px; \}/);
  assert.match(landingHtml, /\.capability-map-card p, \.capability-map-card li \{ font-size: 14px; line-height: 1\.65; \}/);
  assert.match(landingHtml, /\.capability \{ min-height: 350px; padding: 28px; \}/);
  assert.match(landingHtml, /\.capability-map-card \{ min-height: 0; padding: 26px; \}/);
});

test('Task 198 keeps the remaining current pricing cards mobile-safe after removing the Jarvis section', () => {
  assert.match(landingHtml, /\.capability-grid, \.capability-map-grid, \.plans, \.plan-decider, \.proof-strip \{ grid-template-columns: 1fr; \}/);
  assert.match(landingHtml, /<strong>£20<\/strong><span>\/ month<\/span>/);
  assert.match(landingHtml, /<strong>£75<\/strong><span>\/ month<\/span>/);
});

test('Task 197 keeps every plan description and fit statement readable in light theme', () => {
  assert.match(landingHtml, /body\.light \.plan h3 \{ color: #211a35; \}/);
  assert.match(landingHtml, /body\.light \.plan-desc \{ color: #514967; \}/);
  assert.match(landingHtml, /body\.light \.plan-fit \{ border-color: rgba\(84,67,128,\.18\); color: #453b58; background: rgba\(247,245,252,\.92\); \}/);
  assert.match(landingHtml, /body\.light \.plan\.featured \.plan-fit \{ border-color: rgba\(20,140,112,\.28\); color: #254f44; background: rgba\(82,225,181,\.13\); \}/);
  assert.match(landingHtml, /body\.light \.price span, body\.light \.plan li \{ color: #514967; \}/);
});

test('Task 199 keeps the approved landing structure clear, test-oriented, and free of new unsupported outcomes', () => {
  const sectionOrder = [
    'class="hero container"',
    'class="launch-deck"',
    '<section class="section container" id="how-it-works">',
    '<section class="section container" id="capabilities">',
    '<section class="section container why-stellar-section" id="why-stellar">',
    '<section class="pricing-wrap" id="plans">',
    'class="faq-layout"',
    'class="final-cta"'
  ];
  let previousIndex = -1;
  for (const marker of sectionOrder) {
    const currentIndex = landingHtml.indexOf(marker);
    assert.ok(currentIndex > previousIndex, `${marker} should remain in the approved landing flow`);
    previousIndex = currentIndex;
  }
  assert.match(landingHtml, /<p class="workflow-note"><strong>What you get:<\/strong> a structured starting point, explained files and a clear next test\. You remain responsible for reviewing dependencies and testing the result in your own FiveM server or Roblox place\.<\/p>/);
  assert.match(landingHtml, /<div class="eyebrow">A focused 4-step build loop<\/div><h2>Describe it\. Generate it\. Test it\. Improve it\.<\/h2>/);
  for (const step of ['01 / DESCRIBE', '02 / GENERATE', '03 / TEST', '04 / IMPROVE']) {
    assert.match(landingHtml, new RegExp(`<span class="cap-number">${step}<\\/span>`));
  }
  assert.match(landingHtml, /\.capability-grid \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); gap: 15px; \}/);
  assert.match(landingHtml, /\.capability-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(landingHtml, /\.workflow-note \{ max-width: 760px; margin: 20px auto 0;/);
  assert.match(landingHtml, /<div class="final-cta"><div class="eyebrow">Your next system starts here<\/div><h2>Start the next build while the idea is still fresh\.<\/h2><p>Open Stellar, describe the system, review the files, then test the next version in your own environment\.<\/p>/);
  assert.doesNotMatch(landingHtml, /guaranteed|no testing required|automatically install/i);
});
