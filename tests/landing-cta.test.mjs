import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const html = read('index.html');
const js = read('lib/assets/homepage.js');
const css = read('lib/assets/homepage.css');
const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];

test('hero stays concise and offers first-run onboarding', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<div class="oa2-wordmark">STELLAR AI<\/div>/);
  assert.match(html, /AI for real work\./);
  assert.match(html, /Ask anything in Stellar AI\. Use StellarX when you want the AI to build, fix or work with your files and apps\./);
  assert.match(html, /href="\/app\?welcome=1"/);
  assert.match(html, /No card required/);
  assert.match(html, /1 starting credit/);
  assert.match(html, /href="#plans" class="oa2-secondary-action">See pricing<\/a>/);
});

test('preview is an example and its bounded prompt opens the app without generating', () => {
  assert.match(html, /Product preview/);
  assert.match(html, /EXAMPLE RESPONSE/);
  assert.match(html, /<form[^>]*action="\/app" method="get"/);
  assert.match(html, /<label for="build-prompt">/);
  assert.match(html, /<textarea[^>]*name="prompt"[^>]*maxlength="2000" required/);
  assert.match(js, /prompt\.value\.trim\(\)\.slice\(0, 2000\)/);
  assert.doesNotMatch(js, /innerHTML|fetch\(|\/api\/chat/);
});

test('keyboard users can skip to main content and dismiss the mobile menu', () => {
  assert.match(html, /href="#main-content" class="skip-link"/);
  assert.match(html, /<main id="main-content" tabindex="-1">/);
  assert.match(html, /<button[^>]*id="nav-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="mobile-nav"/);
  assert.match(html, /<nav[^>]*id="mobile-nav"[^>]*hidden/);
  assert.match(js, /event\.key === 'Escape'/);
  assert.match(js, /restoreFocus && wasOpen/);
  assert.match(css, /:focus-visible/);
});

test('core AI product routes remain reachable without JavaScript', () => {
  for (const path of ['/app?welcome=1','/desktop','/plugins','/models']) assert.ok(html.includes('href="' + path + '"'));
  for (const id of ['product-map','stellarx-home','capabilities','plans']) assert.ok(html.includes('id="' + id + '"'));
});

test('landing explains when to use chat, StellarX, plugins and models', () => {
  assert.match(html, /<h3>Stellar AI<\/h3>/);
  assert.match(html, /<h3>StellarX<\/h3>/);
  assert.match(html, /<h3>Plugins<\/h3>/);
  assert.match(html, /<h3>Models<\/h3>/);
  assert.match(html, /code, files, approved computer tasks and connected tools/);
  assert.match(html, /Connect supported services only when a task needs access to a real tool or account/);
});

test('visible pricing and structured offers agree on current monthly and yearly amounts', () => {
  const offers = graph.find(x => x['@type'] === 'SoftwareApplication').offers;
  assert.deepEqual(offers.map(x => [x.name,x.price,x.priceCurrency]), [
    ['Free','0','GBP'],['Starter monthly','8','GBP'],['Starter yearly','67','GBP'],
    ['Plus monthly','20','GBP'],['Plus yearly','168','GBP'],['Pro monthly','75','GBP'],['Pro yearly','630','GBP']
  ]);
  for (const price of [0,8,20,75]) assert.match(html, new RegExp('<strong>[^<]*' + price + '</strong>'));
  for (const price of [67,168,630]) assert.match(html, new RegExp('[^0-9]' + price + '/year'));
  for (const allowance of ['300 credits/day','4,000 credits/month','12,000 credits/month','48,000 credits/month']) assert.ok(html.includes(allowance));
  assert.match(html, /Credits are used when Stellar processes a message/);
  assert.match(html, /Free credits refresh daily/);
  assert.match(html, /Bought add-on credits stay on your account/);
});

test('paid actions preserve monthly and annual plan intent while Free remains a direct entry', () => {
  for (const plan of ['starter','plus','pro','starter-annual','plus-annual','pro-annual']) {
    assert.ok(html.includes('href="/app?upgrade=' + plan + '"'), plan);
  }
  assert.match(html, /href="\/app"[^>]*aria-label="Start with the Free plan"/);
});

test('native FAQ disclosures match the published FAQ metadata', () => {
  const faq = graph.find(x => x['@type'] === 'FAQPage').mainEntity;
  const details = [...html.matchAll(/<details><summary>(.*?)<span[^>]*>\+<\/span><\/summary><p>(.*?)<\/p><\/details>/g)];
  assert.equal(details.length, 6);
  assert.deepEqual(details.map(x => [x[1], x[2]]), faq.map(x => [x.name,x.acceptedAnswer.text]));
});

test('final CTA gives a truthful free onboarding entry', () => {
  const final = html.match(/<section class="container final-cta">(.*?)<\/section>/s)[1];
  assert.match(final, /href="\/app\?welcome=1"/);
  assert.match(final, /(?:Free to begin\. No card needed\.|The app is free to begin with no card needed\.)/);
});

test('dark-only homepage makes native anchor navigation clear of its sticky header', () => {
  assert.doesNotMatch(html, /id="theme-toggle"|automaticTheme/);
  assert.match(css, /color-scheme:\s*dark/);
  assert.match(css, /scroll-padding-top:\s*90px/);
  const targets = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]));
  for (const [,target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(targets.has(target), target);
});

test('support uses the dedicated support route while Discord remains a separate community link', () => {
  assert.match(html, /href="\/support">Support<\/a>/);
  assert.match(html, /href="https:\/\/discord\.gg\/e6uRAV9HGA"[^>]*>Discord/);
  for (const path of ['/terms','/privacy','/blog']) assert.ok(html.includes('href="' + path + '"'));
  assert.doesNotMatch(html, /mailto:/);
});

test('public metadata describes a free developer workspace without unverified endorsements', () => {
  const app = graph.find(x => x['@type'] === 'SoftwareApplication');
  assert.equal(app.applicationCategory, 'BusinessApplication');
  assert.equal(app.isAccessibleForFree, true);
  assert.match(html, /rel="canonical" href="https:\/\/trystellarai\.com"/);
  assert.doesNotMatch(html, /Used by FiveM and Roblox builders worldwide|guaranteed profit|guaranteed approval/i);
});

test('starter links are converted into editable app prompts rather than auto-submitted generations', () => {
  const app = read('app.html');
  assert.match(app, /const STARTER_PROMPTS=Object\.freeze/);
  assert.match(app, /function starterPrompt\(value\)/);
  assert.match(app, /function consumeInboundPrompt\(\)/);
  assert.match(app, /params\.delete\(key\)/);
  assert.match(app, /history\.replaceState/);
  assert.doesNotMatch(app, /consumeInboundPrompt\(\);[\s\S]{0,400}requestSubmit\(\)/);
});


