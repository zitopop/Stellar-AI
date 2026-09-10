import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('repository root contains only approved product and standard files/folders', () => {
  const allowed = new Set([
    '.gitignore', 'LICENSE', 'CONTRIBUTING.md',
    'index.html', 'app.html', 'terms.html', 'blog.html', 'offline.html', 'affiliate.html',
    'manifest.json', 'vercel.json', 'sw.js', 'robots.txt', 'sitemap.xml', 'llms.txt',
    'README.md', 'package.json', 'package-lock.json',
    'api', 'blog', 'lib', 'scripts', 'tests', 'assets', 'archive',
  ]);
  const actual = fs.readdirSync(root).filter((name) => name !== '.git').sort();
  const unexpected = actual.filter((name) => !allowed.has(name) && !/^favicon(?:[-.].*)?$/i.test(name));
  assert.deepEqual(unexpected, []);
});

test('app primary CSS is external and static inline style attributes are removed', () => {
  const app = read('app.html');
  assert.ok(app.includes('<link rel="stylesheet" href="/assets/styles.css">'));
  assert.ok(!/\sstyle=(["']).*?\1/is.test(app));
  assert.ok(fs.statSync(path.join(root, 'assets/styles.css')).size > 150_000);
  assert.ok(fs.statSync(path.join(root, 'app.html')).size < 550_000);
});

test('all app images are explicitly lazy-loaded', () => {
  const app = read('app.html');
  const images = app.match(/<img\b[^>]*>/gi) || [];
  assert.equal(images.length, 3);
  assert.ok(images.every((tag) => /\bloading=["']lazy["']/i.test(tag)));
});

test('all 74 canonical blog rewrites still target real HTML files', () => {
  const config = JSON.parse(read('vercel.json'));
  const routes = (config.rewrites || []).filter((item) =>
    item.source?.startsWith('/blog/') && /^\/blog\/[^/]+\.html$/.test(item.destination || '')
  );
  assert.equal(routes.length, 74);
  for (const route of routes) {
    assert.ok(fs.existsSync(path.join(root, route.destination.slice(1))), `${route.source} -> ${route.destination}`);
  }
});

test('PWA icons and splash assets live in their organised folders', () => {
  for (const size of [57,72,76,114,120,144,152,180,192,512]) {
    assert.ok(fs.existsSync(path.join(root, `assets/icons/icon-${size}.png`)));
  }
  for (const name of ['splash-iphone.png','splash-iphone-landscape.png','splash-ipad.png','splash-ipad-landscape.png']) {
    assert.ok(fs.existsSync(path.join(root, `assets/splash/${name}`)));
  }
  assert.ok(fs.existsSync(path.join(root, 'assets/icons/favicon.svg')));
});

test('legacy public asset and model URLs remain routed after physical moves', () => {
  const config = JSON.parse(read('vercel.json'));
  const routes = new Map((config.rewrites || []).map((item) => [item.source, item.destination]));
  assert.equal(routes.get('/models'), '/lib/pages/models');
  assert.equal(routes.get('/models.html'), '/lib/pages/models.html');
  assert.equal(routes.get('/currency.js'), '/assets/js/currency.js');
  assert.equal(routes.get('/og-image.png'), '/assets/img/og-image.png');
  assert.equal(routes.get('/lib/assets/pwa/icon-192.png'), '/assets/icons/icon-192.png');
});
