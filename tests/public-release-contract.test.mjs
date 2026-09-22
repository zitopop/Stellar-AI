import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(name.startsWith('blog-') ? `../blog/${name}` : `../${name}`, import.meta.url), 'utf8');
const indexHtml = read('index.html');
const appHtml = read('app.html');
const termsHtml = read('terms.html');
const supportHtml = read('support.html');
const launchKit = read('archive/docs/LAUNCH-KIT.md');
const simulatorBlogHtml = read('blog-roblox-simulator-game.html');
const comparisonBlogHtml = read('blog-stellar-ai-vs-swisserai-qbcore-roblox.html');

test('public Simulator destinations never use the retired ID and the published guide uses the approved game ID', () => {
  for (const html of [indexHtml, appHtml, simulatorBlogHtml]) {
    assert.doesNotMatch(html, /121360078498296/);
  }
  assert.match(simulatorBlogHtml, /https:\/\/www\.roblox\.com\/games\/17874928076\/Stellar-Simulator/);
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
  assert.match(termsHtml, /The current plans are Free \(£0\), Starter \(£8 per month or £67 per year\), Plus \(£20 per month or £168 per year\), and Pro \(£75 per month or £630 per year\)/);
  assert.match(termsHtml, /The hourly request allowances are 40, 120, 400, and 1,600 respectively/);
  assert.match(termsHtml, /Signed-in users can buy one-off credit top-ups from 50p to £200/);
  assert.match(termsHtml, /The current referral offer awards £1 promotional credit to an eligible new user and £1 to the referrer/);
  assert.match(termsHtml, /Signed-in chat history is stored in account storage/);
  assert.doesNotMatch(termsHtml, /Working draft — have a qualified lawyer review before relying on it/);
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
  assert.match(indexHtml, /applicationCategory":"DeveloperApplication"/);
  assert.match(indexHtml, /isAccessibleForFree":true/);
  assert.match(indexHtml, /FiveM QBCore, ESX, ox_lib and standalone resources, or Roblox Luau systems/);
  for (const framework of ['FiveM', 'QBCore', 'ESX', 'ox_lib', 'Roblox']) assert.ok(indexHtml.includes(framework));
  assert.doesNotMatch(indexHtml, /Used by FiveM and Roblox builders worldwide/);
});

test('Free users receive one dismissible post-generation Starter offer', () => {
  assert.match(appHtml, /id="free-upgrade-nudge" hidden role="status" aria-live="polite"/);
  assert.match(appHtml, /Your build is ready\.<\/strong> Starter gives you 120 requests\/hour and longer generations for £8\/mo\. Your current chat and files stay here\./);
  assert.match(appHtml, /Compare plans/);
  assert.match(appHtml, /function maybeShowFreeUpgradeNudge\(\)/);
  assert.match(appHtml, /stellar_post_generation_upgrade_shown/);
  assert.match(appHtml, /setGenerationStatus\('Generation completed\.'\);\s+maybeShowFreeUpgradeNudge\(\);/);
  assert.doesNotMatch(appHtml, /sent > 0 && sent % 3 === 0/);
  assert.match(appHtml, /function dismissFreeUpgradeNudge\(\)/);
  assert.doesNotMatch(appHtml, /fetch\(['"]\/api\/upgrade/);
});

test('homepage respects reduced motion while the workspace retains its flat presentation', () => {
  const css = read('lib/assets/homepage.css');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(appHtml, /Flat minimal presentation: keep every control and dialog, remove decorative depth and motion\./);
  assert.match(appHtml, /body, body \*, body \*::before, body \*::after \{ background-image: none !important; \}/);
});

test('landing page keeps factual build benefits without exposing unsupported outcomes', () => {
  assert.match(indexHtml, /Complete files\. Clear placement\./);
  assert.match(indexHtml, /Ready for your review/);
  assert.match(indexHtml, /Always review dependencies and test your build before going live/);
  assert.doesNotMatch(indexHtml, /guaranteed revenue|guaranteed profit|guaranteed approval/i);
  assert.doesNotMatch(indexHtml, /scriptsGenerated|serversPowered|countriesReached/);
});

test('the public support centre stays routed, indexed and keeps email fallback available', () => {
  const routes = new Map(vercel.rewrites.map((route) => [route.source, route.destination]));
  const sitemap = read('sitemap.xml');
  assert.equal(routes.get('/support'), '/support.html');
  assert.match(supportHtml, /href="mailto:support@trystellarai\.com/);
  assert.match(supportHtml, /support@trystellarai\.com/);
  assert.match(sitemap, /https:\/\/trystellarai\.com\/support/);
});

test('Vercel routes every canonical blog slug to its published HTML file', () => {
  const sitemap = read('sitemap.xml');
  const paths = [...sitemap.matchAll(/<loc>https:\/\/trystellarai\.com(\/blog\/[^<]+)<\/loc>/g)].map(([, pathname]) => pathname);
  assert.ok(paths.length >= 74);
  assert.equal(new Set(paths).size, paths.length, 'canonical blog sitemap paths must stay unique');
  assert.ok(!vercel.rewrites.some(({ source }) => source.startsWith('/blog/') && source.includes(':')));
  for (const pathname of paths) {
    const route = vercel.rewrites.find(({ source }) => source === pathname);
    assert.deepEqual(route, { source: pathname, destination: `${pathname}.html` }, pathname);
  }
});

test('all published standalone blog articles have non-empty page titles and descriptions', () => {
  const blogFiles = readdirSync(new URL('../blog/', import.meta.url)).filter((name) => /^blog-.*\.html$/.test(name));
  assert.equal(blogFiles.length, 63);
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
    ['blog-qbcore-police-job-script-free.html', 'https://trystellarai.com/blog/qbcore-police-job-script-free', /QBCore Police Job Script Free/],
    ['blog-roblox-tapping-simulator-script.html', 'https://trystellarai.com/blog/roblox-tapping-simulator-script', /Roblox Tapping Simulator Script/],
    ['blog-stellar-ai-vs-swisserai-qbcore-roblox.html', 'https://trystellarai.com/blog/stellar-ai-vs-swisserai-qbcore-roblox', /Stellar AI vs SwisserAI/],
    ['blog-stellar-ai-vs-enderdevelopment.html', 'https://trystellarai.com/blog/stellar-ai-vs-enderdevelopment', /Stellar AI vs EnderDevelopment/]
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
  const email = read('archive/templates/broadcast-template.html');
  assert.match(email, /A cleaner, flatter workspace with simpler controls and fewer distractions\./);
  assert.match(email, /Specialist planning, research, security and testing roles for structured work\./);
  assert.match(email, /Plus \(£20\/mo\) and Pro \(£75\/mo\) pricing\./);
  assert.match(email, /— The Stellar AI Team 🚀/);
  assert.match(email, /https:\/\/trystellarai\.com\/app/);
  assert.match(email, /Draft only — review the copy and your email compliance requirements before sending\./);
});


test('public root serves the conversion landing page instead of forcing sign-in', () => {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(!vercel.redirects.some((route) => route.source === '/' && /\/app\?signin=1/.test(route.destination || '')));
  assert.ok(vercel.rewrites.some((route) => route.source === '/' && route.destination === '/index.html'));
});
