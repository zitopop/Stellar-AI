#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredPrefixes = [
  'http://', 'https://', 'mailto:', 'tel:', '#', 'javascript:', 'data:',
  '/api/', '/auth/', '/checkout', '/billing'
];

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

function walk(dir, results = []) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return results;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist-static') continue;
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(next, results);
    else if (/\.html?$/i.test(entry.name)) results.push(next.replace(/\\/g, '/'));
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
  if (route === '/') return exists('index.html');
  const withoutSlash = route.replace(/^\//, '');
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
