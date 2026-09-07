import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeMap = {
  'roblox-ai-game-builder': 'roblox-ai-game-builder.html',
  'fivem-ai-script-generator': 'fivem-ai-script-generator.html',
  'qbcore-ai-script-generator': 'qbcore-ai-script-generator.html',
  'qbcore-ambulance-job': 'blog-ambulance-job.html',
  'fivem-death-respawn-system': 'blog-ambulance-system.html',
  'qbcore-atm-robbery': 'blog-atm-robbery.html',
  'fivem-bank-heist-script': 'blog-bank-heist.html',
  'fivem-bank-robbery-script': 'blog-bank-robbery.html',
  'qbcore-car-dealer': 'blog-car-dealer.html',
  'qbcore-casino-script': 'blog-casino.html',
  'qbcore-clothing-script': 'blog-clothing.html',
  'qbcore-crafting-system': 'blog-crafting.html',
  'qbcore-drug-processing': 'blog-drug-processing.html',
  'qbcore-drug-system': 'blog-drug-system.html',
  'fivem-drug-economy-guide': 'blog-drugs-economy.html',
  'esx-to-qbcore-migration': 'blog-esx-to-qbcore.html',
  'qbcore-farming-job': 'blog-farming.html',
  'qbcore-fire-job': 'blog-fire-job.html',
  'qbcore-fishing-job': 'blog-fishing.html',
  'fivem-anticheat-guide': 'blog-fivem-anticheat.html',
  'fivem-server-backup-guide': 'blog-fivem-backup.html',
  'fivem-discord-whitelist': 'blog-fivem-discord-whitelist.html',
  'fivem-drug-dealer-script': 'blog-fivem-drug-dealer-script.html',
  'fivem-economy-setup-guide': 'blog-fivem-economy.html',
  'common-fivem-errors-guide': 'blog-fivem-errors.html',
  'qbcore-hud-customisation': 'blog-fivem-hud.html',
  'fivem-roleplay-server-tips': 'blog-fivem-roleplay-tips.html',
  'fivem-server-setup': 'blog-fivem-server-setup.html',
  'fivem-fuel-script': 'blog-fuel.html',
  'qbcore-gang-system': 'blog-gang-system.html',
  'qbcore-garbage-job': 'blog-garbage-job.html',
  'fivem-heist-script-guide': 'blog-heist-planning.html',
  'qbcore-housing-script': 'blog-housing.html',
  'qbcore-hunting-job': 'blog-hunting.html',
  'qbcore-inventory-guide': 'blog-inventory.html',
  'qbcore-jobs-system': 'blog-jobs-system.html',
  'qbcore-lawyer-job': 'blog-lawyer-job.html',
  'qbcore-mechanic-job': 'blog-mechanic-job.html',
  'qbcore-mining-job': 'blog-mining.html',
  'install-oxlib-qbcore': 'blog-oxlib.html',
  'qbcore-phone-script': 'blog-phone.html',
  'qbcore-prison-script': 'blog-prison.html',
  'qbcore-mechanic-job-script': 'blog-qbcore-mechanic-job-script.html',
  'qbcore-police-job-script-free': 'blog-qbcore-police-job-script-free.html',
  'how-to-update-qbcore': 'blog-qbcore-update.html',
  'qbcore-vs-esx-comparison': 'blog-qbcore-vs-esx.html',
  'qbcore-racing-script': 'blog-racing.html',
  'qbcore-real-estate': 'blog-real-estate.html',
  'fivem-live-map-setup': 'blog-real-time-map.html',
  'qbcore-reporter-job': 'blog-reporter-job.html',
  'roblox-datastore-tutorial': 'blog-roblox-datastore.html',
  'roblox-gamepass-script': 'blog-roblox-gamepass.html',
  'roblox-gui-tutorial': 'blog-roblox-gui.html',
  'roblox-leaderstats-tutorial': 'blog-roblox-leaderstats.html',
  'roblox-remote-events-tutorial': 'blog-roblox-remote-events.html',
  'roblox-simulator-game-guide': 'blog-roblox-simulator-game.html',
  'roblox-simulator-script-lua': 'blog-roblox-simulator-script-lua.html',
  'roblox-tapping-simulator-script': 'blog-roblox-tapping-simulator-script.html',
  'roblox-tween-service-tutorial': 'blog-roblox-tween.html',
  'fivem-server-optimisation': 'blog-server-optimisation.html',
  'stellar-ai-vs-enderdevelopment': 'blog-stellar-ai-vs-enderdevelopment.html',
  'stellar-ai-vs-swisserai-qbcore-roblox': 'blog-stellar-ai-vs-swisserai-qbcore-roblox.html',
  'qbcore-taxi-job': 'blog-taxi.html',
  'qbcore-trucking-job': 'blog-trucking.html',
  'qbcore-weapon-shop': 'blog-weapon-shop.html',
  'qbcore-whitelist-script': 'blog-whitelist.html'
};

if (Object.keys(routeMap).length !== 66) throw new Error(`Expected 66 routes, got ${Object.keys(routeMap).length}`);

const blogHtml = fs.readFileSync(path.join(root, 'blog.html'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

for (const [slug, sourceFile] of Object.entries(routeMap)) {
  const sourcePath = path.join(root, 'blog', sourceFile);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing source article: blog/${sourceFile}`);
  if (!blogHtml.includes(`href="/blog/${slug}"`)) throw new Error(`Blog hub missing /blog/${slug}`);
  if (!sitemap.includes(`<loc>https://trystellarai.com/blog/${slug}</loc>`)) throw new Error(`Sitemap missing /blog/${slug}`);

  const canonicalUrl = `https://trystellarai.com/blog/${slug}`;
  let html = fs.readFileSync(sourcePath, 'utf8');
  if (/<link\s+rel=["']canonical["']/i.test(html)) {
    html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>(?![\s\S]*<link\s+rel=["']canonical["'])/i, `<link rel="canonical" href="${canonicalUrl}">`);
  }
  html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']+["']\s*\/?>(?![\s\S]*<meta\s+property=["']og:url["'])/i, `<meta property="og:url" content="${canonicalUrl}">`);
  fs.writeFileSync(path.join(root, 'blog', slug), html);
}

const configPath = path.join(root, 'vercel.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const rewrites = Array.isArray(cfg.rewrites) ? cfg.rewrites : [];
cfg.rewrites = rewrites.filter(r => !(typeof r?.source === 'string' && r.source.startsWith('/blog/')));
fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);

for (const slug of Object.keys(routeMap)) {
  const generated = path.join(root, 'blog', slug);
  if (!fs.existsSync(generated)) throw new Error(`Missing generated clean static file: blog/${slug}`);
  const html = fs.readFileSync(generated, 'utf8');
  if (!html.includes(`https://trystellarai.com/blog/${slug}`)) throw new Error(`Canonical URL missing from blog/${slug}`);
}

const reparsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if ((reparsed.rewrites || []).some(r => r.source?.startsWith('/blog/'))) throw new Error('Blog rewrites still present');
console.log('Built 66 extensionless static blog pages and removed nested blog rewrites.');
