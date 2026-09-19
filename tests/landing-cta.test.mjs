import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('hero explains the current FiveM and Roblox workflow and routes free users to first-run onboarding', () => {
  assert.match(landingHtml, /<h1>Build FiveM &amp; Roblox systems <span class="gradient-text">with AI\.<\/span><\/h1>/);
  assert.match(landingHtml, /Describe what you want to build or fix\. Stellar gives you complete files, exactly where they go, and clear next steps\./);
  assert.match(landingHtml, /<a href="\/app\?welcome=1" class="button button-primary">Start building free/);
  assert.match(landingHtml, /No card required/);
  assert.match(landingHtml, /£1 starting credit/);
  assert.match(landingHtml, /Review before you publish/);
});

test('hero preview is a labelled interactive workspace preview with an editable prompt', () => {
  assert.match(landingHtml, /<div class="product-frame" role="region" aria-label="Stellar AI build preview">/);
  assert.match(landingHtml, /<form class="preview-compose landing-live-composer"/);
  assert.match(landingHtml, /<textarea class="preview-input"[^>]*aria-label="Ask Stellar AI"[^>]*placeholder="Describe what you want to build…"/);
  assert.match(landingHtml, /<button class="preview-send" type="submit" aria-label="Open this prompt in Stellar AI">/);
});

test('landing keeps keyboard and mobile navigation accessible', () => {
  assert.match(landingHtml, /<a href="#main-content" class="skip-link">Skip to main content<\/a>/);
  assert.match(landingHtml, /<main id="main-content" tabindex="-1">/);
  assert.match(landingHtml, /<button type="button" class="nav-toggle" id="nav-toggle" aria-label="Open navigation menu" aria-controls="mobile-nav" aria-expanded="false">/);
  assert.match(landingHtml, /<div class="mobile-nav" id="mobile-nav" aria-hidden="true" inert>/);
  assert.match(landingHtml, /mobileNav\?\.querySelectorAll\('a'\)\.forEach/);
});test('current build journey exposes How it works, build types, Why Stellar and pricing destinations', () => {
  for (const id of ['how-it-works', 'capabilities', 'why-stellar', 'plans']) {
    assert.match(landingHtml, new RegExp(`id="${id}"`));
  }
  assert.match(landingHtml, /Describe it\. Build it\. Test it\. Improve it\./);
  assert.match(landingHtml, /Stellar AI build types/);
  assert.match(landingHtml, /From an idea to files you can actually use\./);
});

test('FiveM and Roblox guidance stays explicit about private review and testing', () => {
  assert.match(landingHtml, /Review the files and run them in your own private FiveM server or Roblox place\./);
  assert.match(landingHtml, /Generated code still needs to be reviewed and tested in your own server or Roblox place before production use\./);
  assert.match(landingHtml, /QBCore, ESX, ox_lib and standalone/);
  assert.match(landingHtml, /DataStores, RemoteEvents and progression/);
});

test('pricing exposes all four current plans and keeps allowance separate from wallet credit', () => {
  for (const price of ['£0', '£8', '£20', '£75', '£67/year', '£168/year', '£630/year']) {
    assert.match(landingHtml, new RegExp(price.replace('/', '\\/')));
  }
  for (const plan of ['Free', 'Starter', 'Plus', 'Pro']) {
    assert.match(landingHtml, new RegExp(`class="plan-label">${plan}<`));
  }
  assert.match(landingHtml, /40 requests\/hour/);
  assert.match(landingHtml, /120 requests\/hour/);
  assert.match(landingHtml, /400 requests\/hour/);
  assert.match(landingHtml, /1,600 requests\/hour/);
  assert.match(landingHtml, /Wallet credit is separate and can be used after the included allowance\./);
  assert.match(landingHtml, /Stripe checkout/);
  assert.match(landingHtml, /Cancel anytime/);
  assert.match(landingHtml, /GBP pricing/);
});test('pricing actions route to the intended plan without changing approved prices', () => {
  assert.match(landingHtml, /href="\/app" class="button button-secondary" aria-label="Start with the Free plan">Start free<\/a>/);
  assert.match(landingHtml, /href="\/app\?upgrade=starter"[^>]*aria-label="Get Starter"/);
  assert.match(landingHtml, /href="\/app\?upgrade=plus"[^>]*aria-label="Get Plus"/);
  assert.match(landingHtml, /href="\/app\?upgrade=pro"[^>]*aria-label="Get Pro"/);
  assert.match(landingHtml, /Annual plans save 30%/);
});

test('FAQ controls are explicit buttons linked to labelled answer regions', () => {
  const ids = ['faq-test', 'faq-frameworks', 'faq-fix', 'faq-free', 'faq-files', 'faq-cancel'];
  for (const id of ids) {
    assert.match(landingHtml, new RegExp(`<button type="button" id="${id}-button" class="faq-button" aria-expanded="false" aria-controls="${id}-answer">`));
    assert.match(landingHtml, new RegExp(`<div id="${id}-answer" class="faq-answer" role="region" aria-labelledby="${id}-button" aria-hidden="true">`));
  }
  assert.equal((landingHtml.match(/class="faq-plus" aria-hidden="true"/g) || []).length, ids.length);
  assert.match(landingHtml, /setAttribute\('aria-expanded', 'true'\)/);
  assert.match(landingHtml, /setAttribute\('aria-hidden', 'false'\)/);
});

test('final CTA remains a truthful free entry point with paid-plan context', () => {
  assert.match(landingHtml, /<a href="\/app" class="button button-primary" aria-label="Start building free — Generate your first Stellar AI script free">/);
  assert.match(landingHtml, /Paid plans start at £8\/month when you need more usage\. Checkout is handled by Stripe\./);
  assert.match(landingHtml, /Free to begin/);
  assert.match(landingHtml, /No card needed/);
});test('landing remains dark-only and keeps sticky-header hash navigation usable', () => {
  assert.doesNotMatch(landingHtml, /LIGHT_THEME_START_HOUR|DARK_THEME_START_HOUR|automaticTheme\(/);
  assert.match(landingHtml, /root\.classList\.remove\('light'\)/);
  assert.match(landingHtml, /const revealHashTarget = \(hash, behavior = 'smooth'\) => \{/);
  assert.match(landingHtml, /window\.addEventListener\('hashchange'/);
  assert.match(landingHtml, /scroll-margin-top:/);
});

test('landing keeps support and legal destinations visible', () => {
  assert.match(landingHtml, /href="\/terms\.html">Terms<\/a>/);
  assert.match(landingHtml, /href="\/terms\.html#privacy">Privacy<\/a>/);
  assert.match(landingHtml, /href="mailto:support@trystellarai\.com">Support<\/a>/);
  assert.match(landingHtml, /href="\/blog">Guides<\/a>/);
});

test('public metadata describes a free developer workspace without unsupported endorsement claims', () => {
  assert.match(landingHtml, /"applicationSubCategory":"Game development and scripting workspace"/);
  assert.match(landingHtml, /"isAccessibleForFree":true/);
  assert.match(landingHtml, /"priceCurrency":"GBP"/);
  assert.doesNotMatch(landingHtml, /Used by FiveM and Roblox builders worldwide/);
});
