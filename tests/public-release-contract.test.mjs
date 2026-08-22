import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const indexHtml = read('index.html');
const appHtml = read('app.html');
const termsHtml = read('terms.html');
const launchKit = read('LAUNCH-KIT.md');
const simulatorBlogHtml = read('blog-roblox-simulator-game.html');

test('public Simulator destinations use the approved Roblox game ID everywhere', () => {
  for (const html of [indexHtml, appHtml, simulatorBlogHtml]) {
    assert.doesNotMatch(html, /121360078498296/);
    assert.match(html, /https:\/\/www\.roblox\.com\/games\/17874928076\/Stellar-Simulator/);
  }
});

test('public pricing copy and structured offers agree on current GBP pricing', () => {
  assert.match(indexHtml, /"name":"Plus monthly","price":"20","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Plus yearly","price":"168","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Pro monthly","price":"75","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Pro yearly","price":"630","priceCurrency":"GBP"/);
  assert.match(appHtml, /"name": "Plus", "price": "20", "priceCurrency": "GBP"/);
  assert.match(appHtml, /"name": "Pro", "price": "75", "priceCurrency": "GBP"/);
  for (const html of [indexHtml, appHtml]) {
    assert.match(html, /£20/);
    assert.match(html, /£75/);
    assert.match(html, /£168\/year/);
    assert.match(html, /£630\/year/);
  }
  assert.match(termsHtml, /Plus \(£20 per month or £168 per year\) and Pro \(£75 per month or £630 per year\)/);
});

test('repository-owned pricing setup notes do not preserve obsolete Plus or Pro subscriptions', () => {
  assert.match(launchKit, /Plans: Free · Plus £20\/mo · Pro £75\/mo/);
  assert.match(launchKit, /Price: \*\*£20\.00\*\*/);
  assert.match(launchKit, /Price: \*\*£75\.00\*\*/);
  assert.doesNotMatch(launchKit, /Plus £10\/mo|Pro £30\/mo|Price: \*\*£10\.00\*\*|Price: \*\*£30\.00\*\*/);
});

test('directory-facing metadata describes current Stellar features without claiming listing or endorsement', () => {
  assert.match(indexHtml, /<meta name="application-name" content="Stellar AI">/);
  assert.match(indexHtml, /applicationSubCategory":"Game development and scripting workspace"/);
  assert.match(indexHtml, /isAccessibleForFree":true/);
  assert.match(indexHtml, /FiveM QBCore, ESX and ox_lib scripting workflows/);
  assert.match(indexHtml, /Roblox Luau scripting workflows/);
  assert.match(indexHtml, /Built for the frameworks and game workflows Stellar supports\./);
  assert.match(indexHtml, /<span>QBCore<\/span><span>ESX<\/span><span>ox_lib<\/span><span>Roblox<\/span>/);
  assert.doesNotMatch(indexHtml, /Used by FiveM and Roblox builders worldwide/);
});

test('Free users receive only a dismissible local every-third-message upgrade reminder', () => {
  assert.match(appHtml, /id="free-upgrade-nudge" hidden role="status" aria-live="polite"/);
  assert.match(appHtml, /Enjoying Stellar\?<\/strong> Upgrade to Plus for 10× more usage — £20\/mo\./);
  assert.doesNotMatch(appHtml, /id="free-upgrade-nudge"[^>]*style="display:flex/);
  assert.match(appHtml, /#free-upgrade-nudge:not\(\[hidden\]\) \{ display: flex !important; \}/);
  assert.match(appHtml, /function countFreePlanSentMessages\(\)/);
  assert.match(appHtml, /sent > 0 && sent % 3 === 0/);
  assert.match(appHtml, /function dismissFreeUpgradeNudge\(\)/);
  assert.match(appHtml, /Store\.set\(\{ freeUpgradeNudgeDismissedAt: sent \}\)/);
  assert.match(appHtml, /consumeMsg\(\);\s+maybeShowFreeUpgradeNudge\(\);/);
  assert.doesNotMatch(appHtml, /fetch\(['"]\/api\/upgrade/);
});

test('public and workspace styles include the flat minimal presentation guard', () => {
  assert.match(indexHtml, /Flat minimal presentation: decorative depth, gradients and motion are deliberately disabled\./);
  assert.match(indexHtml, /animation: none !important; transition: none !important; box-shadow: none !important;/);
  assert.match(appHtml, /Flat minimal presentation: keep every control and dialog, remove decorative depth and motion\./);
  assert.match(appHtml, /body, body \*, body \*::before, body \*::after \{ background-image: none !important; \}/);
});

test('the public support address remains a one-line mail link in settings', () => {
  assert.match(appHtml, /href="mailto:support@trystellarai\.com"[^>]*white-space:nowrap[^>]*>support@trystellarai\.com<\/a>/);
});

test('all published standalone blog articles have non-empty page titles and descriptions', () => {
  const blogFiles = readdirSync(root).filter((name) => /^blog-.*\.html$/.test(name));
  assert.equal(blogFiles.length, 58);
  for (const file of blogFiles) {
    const html = read(file);
    assert.match(html, /<title>[^<]+<\/title>/, `${file} requires a title`);
    assert.match(html, /<meta name="description" content="[^"]+">/, `${file} requires a description`);
  }
});

test('approved QBCore police and Roblox tapping guides are original long-form public pages with discovery links', () => {
  const sitemap = read('sitemap.xml');
  const hub = read('blog.html');
  const guides = [
    ['blog-qbcore-police-job-script-free.html', 'https://trystellarai.com/blog-qbcore-police-job-script-free.html', /QBCore Police Job Script Free/],
    ['blog-roblox-tapping-simulator-script.html', 'https://trystellarai.com/blog-roblox-tapping-simulator-script.html', /Roblox Tapping Simulator Script/]
  ];
  for (const [file, canonical, title] of guides) {
    const html = read(file);
    const words = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
    assert.ok(words >= 800, `${file} must contain at least 800 readable words`);
    assert.match(html, title);
    assert.match(html, new RegExp(`href="${canonical}"`));
    assert.match(html, /href="\/app\?starter=/);
    assert.match(sitemap, new RegExp(canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(hub, new RegExp(canonical.replace('https://trystellarai.com', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('the unsent feature announcement broadcast draft preserves its review notice and official destination', () => {
  const email = read('broadcast-template.html');
  assert.match(email, /A cleaner, flatter workspace with simpler controls and fewer distractions\./);
  assert.match(email, /Specialist planning, research, security and testing roles for structured work\./);
  assert.match(email, /Plus \(£20\/mo\) and Pro \(£75\/mo\) pricing\./);
  assert.match(email, /— The Stellar AI Team 🚀/);
  assert.match(email, /https:\/\/trystellarai\.com\/app/);
  assert.match(email, /Draft only — review the copy and your email compliance requirements before sending\./);
});
