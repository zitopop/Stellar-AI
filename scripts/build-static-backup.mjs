#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist-static');
const pagesDomain = 'pages.trystellarai.com';

const copyDirs = [
  'blog',
  'services',
  'lib/assets',
  'small-business-ai',
  'ai-inbox-closer',
];

const copyFiles = [
  '404.html',
  'app.html',
  'blog.html',
  'business.html',
  'index.html',
  'manifest.json',
  'models.html',
  'plugins.html',
  'privacy.html',
  'robots.txt',
  'sitemap.xml',
  'support.html',
  'sw.js',
  'terms.html',
  'ai-inbox-closer.html',
  'small-business-ai.html',
  'ai-receptionist.html',
  'website-audit.html',
  'desktop-agent.html',
  'email-agent.html',
  'roblox-studio.html',
];

const cleanRoutePages = [
  'ai-inbox-closer.html',
  'small-business-ai.html',
  'support.html',
  'privacy.html',
  'terms.html',
  'models.html',
  'plugins.html',
  'business.html',
  'blog.html',
  'desktop-agent.html',
  'email-agent.html',
  'roblox-studio.html',
  'ai-receptionist.html',
  'website-audit.html',
];

const leaveAbsolutePrefixes = [
  '/api/',
  '/auth/',
  '/checkout',
  '/billing',
];

function exists(filePath) {
  try { fs.accessSync(filePath); return true; } catch { return false; }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function posixRel(filePath) {
  return filePath.replace(/\\/g, '/');
}

function relativePrefixFor(outputRel) {
  const normalized = posixRel(outputRel).replace(/^\.\//, '');
  const dir = path.posix.dirname(normalized);
  if (!dir || dir === '.') return './';
  const depth = dir.split('/').filter(Boolean).length;
  return '../'.repeat(depth);
}

function shouldLeaveAbsolute(url) {
  return leaveAbsolutePrefixes.some((prefix) => url.startsWith(prefix));
}

function makeRelativeUrl(url, outputRel) {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return url;
  if (shouldLeaveAbsolute(url)) return url;
  const prefix = relativePrefixFor(outputRel);
  const withoutSlash = url.replace(/^\/+/, '');
  return withoutSlash ? `${prefix}${withoutSlash}` : prefix;
}

function rewriteHtmlForStatic(content, outputRel) {
  return content.replace(/\b(href|src)=(["'])(\/[^"']*)\2/gi, (_match, attr, quote, url) => {
    return `${attr}=${quote}${makeRelativeUrl(url, outputRel)}${quote}`;
  });
}

function rewriteCssForStatic(content, outputRel) {
  const prefix = relativePrefixFor(outputRel);
  return content.replace(/url\((['"]?)\/(?!\/)/gi, `url($1${prefix}`);
}

function rewriteCopiedTextFile(filePath) {
  const rel = posixRel(path.relative(out, filePath));
  let content = fs.readFileSync(filePath, 'utf8');
  if (/\.html?$/i.test(rel)) content = rewriteHtmlForStatic(content, rel);
  else if (/\.css$/i.test(rel)) content = rewriteCssForStatic(content, rel);
  else return false;
  fs.writeFileSync(filePath, content);
  return true;
}

function walkOutputTextFiles(dir = out, results = []) {
  if (!exists(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walkOutputTextFiles(next, results);
    else if (/\.(?:html?|css)$/i.test(entry.name)) results.push(next);
  }
  return results;
}

function rewriteCopiedStaticTextFiles() {
  return walkOutputTextFiles().filter((filePath) => rewriteCopiedTextFile(filePath)).length;
}

function topLevelStaticFiles() {
  const staticFilePattern = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|webmanifest)$/i;
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && staticFilePattern.test(entry.name))
    .map((entry) => entry.name);
}

function copyFileSafe(fromRel, toRel = fromRel) {
  const from = path.join(root, fromRel);
  const to = path.join(out, toRel);
  if (!exists(from)) return false;
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  return true;
}

function copyDirSafe(fromRel, toRel = fromRel) {
  const from = path.join(root, fromRel);
  const to = path.join(out, toRel);
  if (!exists(from)) return false;
  fs.cpSync(from, to, { recursive: true, force: true });
  return true;
}

function writeText(rel, content) {
  const target = path.join(out, rel);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content);
}

function routeNameFor(fileName) {
  return fileName.replace(/\.html$/i, '').replace(/-agent$/i, '');
}

function makeCleanRoute(fileName) {
  const source = path.join(root, fileName);
  if (!exists(source)) return false;
  const route = routeNameFor(fileName);
  const target = path.join(out, route, 'index.html');
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
  return true;
}

function makeRedirects() {
  const lines = [
    '# Stellar Deploy static fallback redirects',
    '/app /app.html 200',
    '/support /support.html 200',
    '/privacy /privacy.html 200',
    '/terms /terms.html 200',
    '/models /models.html 200',
    '/plugins /plugins.html 200',
    '/business /business.html 200',
    '/blog /blog.html 200',
    '/desktop /desktop-agent.html 200',
    '/email-agent /email-agent.html 200',
    '/roblox-studio /roblox-studio.html 200',
    '/ai-receptionist /ai-receptionist.html 200',
    '/website-audit /website-audit.html 200',
    '/small-business-ai /small-business-ai.html 200',
    '/ai-inbox-closer /ai-inbox-closer.html 200',
    '/* /404.html 404',
    '',
  ];
  writeText('_redirects', lines.join('\n'));
}

function makeHeaders() {
  const headers = [
    '# Stellar Deploy static fallback headers',
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  X-Frame-Options: SAMEORIGIN',
    '',
    '/lib/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.html',
    '  Cache-Control: public, max-age=300',
    '',
  ];
  writeText('_headers', headers.join('\n'));
}

function makePagesDomain() {
  writeText('CNAME', `${pagesDomain}\n`);
}

function main() {
  fs.rmSync(out, { recursive: true, force: true });
  ensureDir(out);

  const filesToCopy = [...new Set([...copyFiles, ...topLevelStaticFiles()])];
  const copiedFiles = filesToCopy.filter((file) => copyFileSafe(file));
  const copiedDirs = copyDirs.filter((dir) => copyDirSafe(dir));
  const cleanRoutes = cleanRoutePages.filter((file) => makeCleanRoute(file));

  makeRedirects();
  makeHeaders();
  makePagesDomain();
  const rewrittenTextFiles = rewriteCopiedStaticTextFiles();

  console.log('Stellar static backup built.');
  console.log(`Output: ${path.relative(root, out)}`);
  console.log(`Custom domain: ${pagesDomain}`);
  console.log(`Files copied: ${copiedFiles.length}`);
  console.log(`Directories copied: ${copiedDirs.length}`);
  console.log(`Clean routes generated: ${cleanRoutes.length}`);
  console.log(`Static HTML/CSS files rewritten for Pages path safety: ${rewrittenTextFiles}`);
}

main();
