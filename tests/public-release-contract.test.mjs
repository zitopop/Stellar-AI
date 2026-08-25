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
const comparisonBlogHtml = read('blog-stellar-ai-vs-swisserai-qbcore-roblox.html');

test('public Simulator destinations use the approved Roblox game ID everywhere', () => {
  for (const html of [indexHtml, appHtml, simulatorBlogHtml]) {
    assert.doesNotMatch(html, /121360078498296/);
    assert.match(html, /https:\/\/www\.roblox\.com\/games\/17874928076\/Stellar-Simulator/);
  }
});

test('public pricing copy and structured offers agree on current GBP pricing', () => {
  assert.match(indexHtml, /"name":"Starter monthly","price":"8","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Starter yearly","price":"67","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Plus monthly","price":"20","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Plus yearly","price":"168","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Pro monthly","price":"75","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Pro yearly","price":"630","priceCurrency":"GBP"/);
  assert.match(appHtml, /"name": "Starter", "price": "8", "priceCurrency": "GBP"/);
  assert.match(appHtml, /"name": "Plus", "price": "20", "priceCurrency": "GBP"/);
  assert.match(appHtml, /"name": "Pro", "price": "75", "priceCurrency": "GBP"/);
  for (const html of [indexHtml, appHtml]) {
    assert.match(html, /£8/);
    assert.match(html, /£20/);
    assert.match(html, /£75/);
    assert.match(html, /£168\/year/);
    assert.match(html, /£630\/year/);
  }
  assert.match(termsHtml, /Starter \(£8 per month or £67 per year\), Plus \(£20 per month or £168 per year\), and Pro \(£75 per month or £630 per year\)/);
  assert.match(termsHtml, /everything in Free, plus 3× usage \(120 requests per hour\), priority queueing, longer scripts and cancellation at any time/);
  assert.match(termsHtml, /A paid checkout is available only when its corresponding Stripe price is configured for the active Stripe mode; if it is unavailable, no payment is taken\./);
});

test('repository-owned pricing setup notes document the canonical four-plan billing configuration', () => {
  assert.match(launchKit, /Starter \| £8 \| £67/);
  assert.match(launchKit, /Plus \| £20 \| £168/);
  assert.match(launchKit, /Pro \| £75 \| £630/);
  assert.match(launchKit, /STRIPE_PRICE_ID_STARTER/);
  assert.match(launchKit, /STRIPE_PRICE_ID_PLUS/);
  assert.match(launchKit, /STRIPE_PRICE_ID_PRO/);
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
  assert.match(appHtml, /Enjoying Stellar\?<\/strong> Starter gives you 3× more usage and longer scripts for £8\/mo\./);
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

test('landing page uses transparent build benefits until verified activity reaches a meaningful sample', () => {
  assert.match(indexHtml, /id="proof-section"[\s\S]*Start with a real build[\s\S]*Everything you need to make the first version useful\./);
  assert.match(indexHtml, /Full files[\s\S]*FiveM \+ Roblox[\s\S]*No card upfront/);
  assert.match(indexHtml, /Verified activity counters replace these build benefits once Stellar has a meaningful recorded product sample\./);
  assert.match(indexHtml, /const publicProofMinimums = \{[\s\S]*scriptsGenerated: 25[\s\S]*serversPowered: 10[\s\S]*countriesReached: 3[\s\S]*\};/);
  assert.match(indexHtml, /const hasMeaningfulVerifiedSample = Object\.entries\(publicProofMinimums\)\.every/);
  assert.match(indexHtml, /if \(!hasMeaningfulVerifiedSample\) return;/);
  assert.match(indexHtml, /document\.getElementById\('proof-section'\)\?\.setAttribute\('data-proof-state', 'verified'\);/);
});

test('the public support address remains a one-line mail link in settings', () => {
  assert.match(appHtml, /href="mailto:support@trystellarai\.com"[^>]*white-space:nowrap[^>]*>support@trystellarai\.com<\/a>/);
});

test('all published standalone blog articles have non-empty page titles and descriptions', () => {
  const blogFiles = readdirSync(root).filter((name) => /^blog-.*\.html$/.test(name));
  assert.equal(blogFiles.length, 60);
  for (const file of blogFiles) {
    const html = read(file);
    assert.match(html, /<title>[^<]+<\/title>/, `${file} requires a title`);
    assert.match(html, /<meta name="description" content="[^"]+">/, `${file} requires a description`);
  }
});

test('approved long-form public guides have discovery links', () => {
  const sitemap = read('sitemap.xml');
  const hub = read('blog.html');
  const guides = [
    ['blog-qbcore-police-job-script-free.html', 'https://trystellarai.com/blog-qbcore-police-job-script-free.html', /QBCore Police Job Script Free/],
    ['blog-roblox-tapping-simulator-script.html', 'https://trystellarai.com/blog-roblox-tapping-simulator-script.html', /Roblox Tapping Simulator Script/],
    ['blog-stellar-ai-vs-swisserai-qbcore-roblox.html', 'https://trystellarai.com/blog-stellar-ai-vs-swisserai-qbcore-roblox.html', /Stellar AI vs SwisserAI/],
    ['blog-stellar-ai-vs-enderdevelopment.html', 'https://trystellarai.com/blog-stellar-ai-vs-enderdevelopment.html', /Stellar AI vs EnderDevelopment/]
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

test('the EnderDevelopment comparison article names its public pricing source without unsupported universal superiority claims', () => {
  const enderComparisonHtml = read('blog-stellar-ai-vs-enderdevelopment.html');
  assert.match(enderComparisonHtml, /https:\/\/enderdevelopment\.com\/pricing/);
  assert.match(enderComparisonHtml, /Redstone at €8\/month, Obsidian at €38\/month and Bedrock at €120\/month/);
  assert.doesNotMatch(enderComparisonHtml, /always better|outperforms every/i);
});

test('the SwisserAI comparison article names its source scope without unsupported universal superiority claims', () => {
  assert.match(comparisonBlogHtml, /https:\/\/ai\.swisser\.dev\/fivem-script-generator/);
  assert.match(comparisonBlogHtml, /https:\/\/ai\.swisser\.dev\/pricing/);
  assert.match(comparisonBlogHtml, /This is not a claim that one tool is universally better\./);
  assert.match(comparisonBlogHtml, /The reviewed public home, generator, framework and pricing pages position the product around FiveM; they did not present Roblox support\./);
  assert.doesNotMatch(comparisonBlogHtml, /best AI|always better|outperforms every/i);
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
