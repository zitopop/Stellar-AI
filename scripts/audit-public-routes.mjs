#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredPrefixes = [
  'http://', 'https://', 'mailto:', 'tel:', '#', 'javascript:', 'data:',
  '/api/', '/auth/', '/checkout', '/billing', '/jarvis/'
];

const ignoredRoutes = new Set([
  '/deploy',
]);

const ignoredFilePrefixes = [
  'archive/',
];

const ignoredFiles = new Set([
  'affiliate.html',
]);

const expectedCleanRoutes = new Map([
  ['/', 'index.html'],
  ['/app', 'app.html'],
  ['/support', 'support.html'],
  ['/plugins', 'plugins.html'],
  ['/models', 'models.html'],
  ['/desktop', 'desktop-agent.html'],
  ['/roblox-studio', 'roblox-studio.html'],
  ['/business', 'services/business.html'],
  ['/ai-receptionist', 'services/ai-receptionist.html'],
  ['/website-audit', 'services/website-audit.html'],
  ['/small-business-ai', 'small-business-ai/index.html'],
  ['/ai-inbox-closer', 'ai-inbox-closer/index.html'],
  ['/terms', 'terms.html'],
  ['/privacy', 'privacy.html'],
  ['/blog', 'blog.html'],
]);

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function shouldSkipFile(relativeFile) {
  const normalized = relativeFile.replace(/^\.\//, '');
  return ignoredFiles.has(normalized) || ignoredFilePrefixes.some(prefix => normalized.startsWith(prefix));
}

function walk(dir, results = []) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return results;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist-static') continue;
    const next = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(next, results);
    else if (/\.html?$/i.test(entry.name) && !shouldSkipFile(next)) results.push(next.replace(/^\.\//, ''));
  }
  return results;
}

function normaliseHref(raw) {
  const href = String(raw || '').trim();
  if (!href || ignoredPrefixes.some(prefix => href.startsWith(prefix))) return '';
  if (!href.startsWith('/')) return '';
  return href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
}

function routeExists(route) {
  if (ignoredRoutes.has(route)) return true;
  if (route === '/') return exists('index.html');

  const withoutSlash = route.replace(/^\//, '');

  // Legacy explicit .html links are valid if that file exists.
  if (/\.html?$/i.test(withoutSlash) && exists(withoutSlash)) return true;

  // Legacy explicit .html links can also point at a known clean route.
  const cleanAlias = route.replace(/\.html?$/i, '');
  if (cleanAlias !== route && (expectedCleanRoutes.has(cleanAlias) || routeExists(cleanAlias))) return true;

  return exists(`${withoutSlash}.html`) || exists(`${withoutSlash}/index.html`);
}

const errors = [];
for (const [route, file] of expectedCleanRoutes) {
  if (!exists(file)) errors.push(`Expected clean route ${route} is missing source file ${file}`);
}

const htmlFiles = walk('.');
const hrefPattern = /\b(?:href|src)=["']([^"']+)["']/gi;
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of content.matchAll(hrefPattern)) {
    const route = normaliseHref(match[1]);
    if (!route) continue;
    const isAsset = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|json|xml|txt|mp3|wav|webmanifest)$/i.test(route);
    if (isAsset) continue;
    if (!routeExists(route) && !expectedCleanRoutes.has(route)) {
      errors.push(`${file} links to missing internal route: ${route}`);
    }
  }
}

if (errors.length) {
  console.error('\nStellar route audit failed:\n');
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
  if (errors.length > 80) console.error(`- ...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(`Stellar route audit passed. Checked ${htmlFiles.length} HTML files and ${expectedCleanRoutes.size} core clean routes.`);
