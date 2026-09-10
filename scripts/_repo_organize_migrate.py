from pathlib import Path
from urllib.parse import urljoin
import html as html_lib
import json
import re
import shutil

ROOT = Path('.')

def ensure_parent(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)

def move(src, dst):
    src = Path(src); dst = Path(dst)
    if not src.exists():
        return
    ensure_parent(dst)
    if dst.exists():
        raise SystemExit(f'destination already exists: {dst}')
    shutil.move(str(src), str(dst))

moves = {
    'currency.js': 'assets/js/currency.js',
    'site-polish.css': 'assets/css/site-polish.css',
    'stellar-growth-v1.css': 'assets/css/stellar-growth-v1.css',
    'stellar-growth-v1.js': 'assets/js/stellar-growth-v1.js',
    'stellar-orbit-extras.css': 'assets/css/stellar-orbit-extras.css',
    'stellar-orbit.css': 'assets/css/stellar-orbit.css',
    'stellar-orbit.js': 'assets/js/stellar-orbit.js',
    'stellar-settings-extensions.css': 'assets/css/stellar-settings-extensions.css',
    'stellar-settings-extensions.js': 'assets/js/stellar-settings-extensions.js',
    'stellar-settings-v4.css': 'assets/css/stellar-settings-v4.css',
    'og-image.png': 'assets/img/og-image.png',
    'lib/assets/stellar-simulator-mark.png': 'assets/img/stellar-simulator-mark.png',
    'lib/assets/stellar-simulator-thumb.png': 'assets/img/stellar-simulator-thumb.png',
    'lib/assets/stellar-strike-mark.png': 'assets/img/stellar-strike-mark.png',
    'lib/assets/stellar-strike-thumb.png': 'assets/img/stellar-strike-thumb.png',
    'lib/assets/pwa/favicon.svg': 'assets/icons/favicon.svg',
}
for src, dst in moves.items():
    move(src, dst)

for p in sorted(Path('lib/assets/pwa').glob('icon-*.png')):
    move(p, Path('assets/icons') / p.name)
for p in sorted(Path('lib/assets/pwa').glob('splash-*.png')):
    move(p, Path('assets/splash') / p.name)

move('models', 'lib/pages/models')
move('models.html', 'lib/pages/models.html')

for p in sorted(Path('docs').glob('*')) if Path('docs').exists() else []:
    if p.is_file():
        move(p, Path('archive/docs/repository') / p.name)
if Path('docs').exists() and not any(Path('docs').iterdir()):
    Path('docs').rmdir()

for name in ('apply-growth-seo-v1.yml', 'audit-growth-release-74-live.yml'):
    p = Path('.github/workflows') / name
    if p.exists():
        move(p, Path('archive/ci/github-actions') / name)

for name in ('create-400-task-tracker.mjs', 'migrate_blog_posts.py'):
    p = Path('scripts') / name
    if p.exists():
        move(p, Path('archive/scripts/legacy-tools') / name)

archived_blog_routes = []
vercel_before = json.loads(Path('vercel.json').read_text(encoding='utf-8'))
canonical_blog_targets = {
    item.get('destination', '').lstrip('/')
    for item in vercel_before.get('rewrites', [])
    if item.get('source', '').startswith('/blog/')
}
for p in sorted(Path('blog').glob('blog-*.html')):
    if p.as_posix() in canonical_blog_targets:
        continue
    dst = Path('archive/legacy-blog/superseded-blog-files') / p.name
    move(p, dst)
    archived_blog_routes.append((f'/{p.as_posix()}', f'/{dst.as_posix()}'))

app_path = Path('app.html')
app = app_path.read_text(encoding='utf-8')
style_re = re.compile(r'<style(?P<attrs>[^>]*)>(?P<body>[\s\S]*?)</style>', re.I)
blocks = list(style_re.finditer(app))
if len(blocks) < 2:
    raise SystemExit('Expected multiple app style blocks')
primary = max((m for m in blocks if not m.group('attrs').strip()), key=lambda m: len(m.group('body').encode('utf-8')))
if len(primary.group('body').encode('utf-8')) < 150_000:
    raise SystemExit('Refusing to extract an unexpectedly small primary style block')

def normalize_css_urls(css, original_document='/app'):
    def repl(m):
        quote = m.group(1) or ''
        raw = m.group(2).strip()
        low = raw.lower()
        if (not raw or raw.startswith(('/', '#', '//')) or
            low.startswith(('data:', 'http:', 'https:', 'blob:', 'var('))):
            return m.group(0)
        resolved = urljoin(original_document, raw)
        return f'url({quote}{resolved}{quote})'
    return re.sub(r'url\(\s*([\'"]?)([^\'")]+)\1\s*\)', repl, css, flags=re.I)

primary_css = normalize_css_urls(primary.group('body'))
link = '<link rel="stylesheet" href="/assets/styles.css">'
app = app[:primary.start()] + link + app[primary.end():]

tag_re = re.compile(r'<[A-Za-z][^<>]*>', re.S)
style_attr_re = re.compile(r'''\sstyle=(["'])(.*?)\1''', re.I | re.S)
class_attr_re = re.compile(r'''\sclass=(["'])(.*?)\1''', re.I | re.S)
style_to_class = {}
style_rules = []

def replace_tag(match):
    tag = match.group(0)
    sm = style_attr_re.search(tag)
    if not sm:
        return tag
    raw_value = sm.group(2)
    css = normalize_css_urls(html_lib.unescape(raw_value).strip())
    if any(token in css for token in ('${', '{{', '<%')):
        raise SystemExit(f'Dynamic inline style cannot be safely extracted: {raw_value[:120]}')
    if css not in style_to_class:
        idx = len(style_to_class)
        cls = f'stellar-inline-style-{idx:03d}'
        style_to_class[css] = cls
        selector = (
            f':is(#_stellar-inline-a-{idx},.{cls})'
            f':is(#_stellar-inline-b-{idx},.{cls})'
            f':is(#_stellar-inline-c-{idx},.{cls})'
        )
        style_rules.append(f'{selector}{{{css}}}')
    cls = style_to_class[css]
    tag = tag[:sm.start()] + tag[sm.end():]
    cm = class_attr_re.search(tag)
    if cm:
        existing = cm.group(2)
        replacement = (existing + ' ' + cls).strip()
        tag = tag[:cm.start(2)] + replacement + tag[cm.end(2):]
    else:
        insert_at = tag.rfind('/>') if tag.rstrip().endswith('/>') else tag.rfind('>')
        tag = tag[:insert_at] + f' class="{cls}"' + tag[insert_at:]
    return tag

app = tag_re.sub(replace_tag, app)
if style_attr_re.search(app):
    raise SystemExit('Static inline style attributes remain after extraction')

def lazy_img(match):
    tag = match.group(0)
    if re.search(r'\bloading\s*=', tag, re.I):
        return tag
    insert_at = tag.rfind('/>') if tag.rstrip().endswith('/>') else tag.rfind('>')
    return tag[:insert_at] + ' loading="lazy"' + tag[insert_at:]

app = re.sub(r'<img\b[^<>]*>', lazy_img, app, flags=re.I | re.S)

styles_path = Path('assets/styles.css')
ensure_parent(styles_path)
styles_path.write_text(
    primary_css.rstrip() +
    '\n\n/* Static inline declarations extracted from app.html. High selector specificity preserves inline cascade semantics without !important escalation. */\n' +
    '\n'.join(style_rules) + '\n',
    encoding='utf-8'
)
app_path.write_text(app, encoding='utf-8')

for css_path in Path('assets/css').glob('*.css'):
    text = css_path.read_text(encoding='utf-8')
    css_path.write_text(normalize_css_urls(text, '/'), encoding='utf-8')

replacements = [
    ('https://trystellarai.com/og-image.png', 'https://trystellarai.com/assets/img/og-image.png'),
    ('/lib/assets/pwa/favicon.svg', '/assets/icons/favicon.svg'),
    ('/lib/assets/pwa/icon-', '/assets/icons/icon-'),
    ('/lib/assets/pwa/splash-', '/assets/splash/splash-'),
    ('/lib/assets/stellar-', '/assets/img/stellar-'),
    ('/og-image.png', '/assets/img/og-image.png'),
    ('/stellar-settings-extensions.css', '/assets/css/stellar-settings-extensions.css'),
    ('/stellar-settings-extensions.js', '/assets/js/stellar-settings-extensions.js'),
    ('/stellar-settings-v4.css', '/assets/css/stellar-settings-v4.css'),
    ('/stellar-orbit-extras.css', '/assets/css/stellar-orbit-extras.css'),
    ('/stellar-orbit.css', '/assets/css/stellar-orbit.css'),
    ('/stellar-orbit.js', '/assets/js/stellar-orbit.js'),
    ('/stellar-growth-v1.css', '/assets/css/stellar-growth-v1.css'),
    ('/stellar-growth-v1.js', '/assets/js/stellar-growth-v1.js'),
    ('/site-polish.css', '/assets/css/site-polish.css'),
    ('/currency.js', '/assets/js/currency.js'),
    ('lib/assets/pwa/favicon.svg', 'assets/icons/favicon.svg'),
    ('lib/assets/pwa/icon-', 'assets/icons/icon-'),
    ('lib/assets/pwa/splash-', 'assets/splash/splash-'),
    ('lib/assets/stellar-', 'assets/img/stellar-'),
    ('../stellar-settings-extensions.css', '../assets/css/stellar-settings-extensions.css'),
    ('../stellar-settings-extensions.js', '../assets/js/stellar-settings-extensions.js'),
    ('../stellar-settings-v4.css', '../assets/css/stellar-settings-v4.css'),
    ('../stellar-orbit-extras.css', '../assets/css/stellar-orbit-extras.css'),
    ('../stellar-orbit.css', '../assets/css/stellar-orbit.css'),
    ('../stellar-orbit.js', '../assets/js/stellar-orbit.js'),
    ('../stellar-growth-v1.css', '../assets/css/stellar-growth-v1.css'),
    ('../stellar-growth-v1.js', '../assets/js/stellar-growth-v1.js'),
    ('../site-polish.css', '../assets/css/site-polish.css'),
    ('../currency.js', '../assets/js/currency.js'),
]

text_suffixes = {'.html','.json','.js','.mjs','.py','.xml','.md','.txt','.css','.yml','.yaml'}
for p in ROOT.rglob('*'):
    if not p.is_file() or '.git' in p.parts or 'archive' in p.parts:
        continue
    if p.suffix.lower() not in text_suffixes and p.name not in {'models'}:
        continue
    try:
        text = p.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    original = text
    for old, new in replacements:
        text = text.replace(old, new)
    helper_map = {
        "read('currency.js')": "read('assets/js/currency.js')",
        'read("currency.js")': 'read("assets/js/currency.js")',
        "read('stellar-growth-v1.js')": "read('assets/js/stellar-growth-v1.js')",
        "read('stellar-orbit.js')": "read('assets/js/stellar-orbit.js')",
        "read('stellar-settings-extensions.js')": "read('assets/js/stellar-settings-extensions.js')",
        "read('site-polish.css')": "read('assets/css/site-polish.css')",
        "read('stellar-growth-v1.css')": "read('assets/css/stellar-growth-v1.css')",
        "read('stellar-orbit.css')": "read('assets/css/stellar-orbit.css')",
        "read('stellar-orbit-extras.css')": "read('assets/css/stellar-orbit-extras.css')",
        "read('stellar-settings-extensions.css')": "read('assets/css/stellar-settings-extensions.css')",
        "read('stellar-settings-v4.css')": "read('assets/css/stellar-settings-v4.css')",
    }
    for old, new in helper_map.items():
        text = text.replace(old, new)
    if text != original:
        p.write_text(text, encoding='utf-8')

for p in Path('tests').glob('*.mjs'):
    text = p.read_text(encoding='utf-8')
    regex_repls = {
        r'\/currency\.js': r'\/assets\/js\/currency\.js',
        r'\/stellar-orbit\.js': r'\/assets\/js\/stellar-orbit\.js',
        r'\/stellar-orbit\.css': r'\/assets\/css\/stellar-orbit\.css',
        r'\/stellar-growth-v1\.js': r'\/assets\/js\/stellar-growth-v1\.js',
        r'\/stellar-growth-v1\.css': r'\/assets\/css\/stellar-growth-v1\.css',
        r'\/site-polish\.css': r'\/assets\/css\/site-polish\.css',
    }
    for old, new in regex_repls.items():
        text = text.replace(old, new)
    p.write_text(text, encoding='utf-8')

vercel_path = Path('vercel.json')
vercel = json.loads(vercel_path.read_text(encoding='utf-8'))

compat = {
    '/models': '/lib/pages/models',
    '/models.html': '/lib/pages/models.html',
    '/currency.js': '/assets/js/currency.js',
    '/site-polish.css': '/assets/css/site-polish.css',
    '/stellar-growth-v1.css': '/assets/css/stellar-growth-v1.css',
    '/stellar-growth-v1.js': '/assets/js/stellar-growth-v1.js',
    '/stellar-orbit-extras.css': '/assets/css/stellar-orbit-extras.css',
    '/stellar-orbit.css': '/assets/css/stellar-orbit.css',
    '/stellar-orbit.js': '/assets/js/stellar-orbit.js',
    '/stellar-settings-extensions.css': '/assets/css/stellar-settings-extensions.css',
    '/stellar-settings-extensions.js': '/assets/js/stellar-settings-extensions.js',
    '/stellar-settings-v4.css': '/assets/css/stellar-settings-v4.css',
    '/og-image.png': '/assets/img/og-image.png',
    '/lib/assets/pwa/favicon.svg': '/assets/icons/favicon.svg',
    '/lib/assets/stellar-simulator-mark.png': '/assets/img/stellar-simulator-mark.png',
    '/lib/assets/stellar-simulator-thumb.png': '/assets/img/stellar-simulator-thumb.png',
    '/lib/assets/stellar-strike-mark.png': '/assets/img/stellar-strike-mark.png',
    '/lib/assets/stellar-strike-thumb.png': '/assets/img/stellar-strike-thumb.png',
}
for p in Path('assets/icons').glob('icon-*.png'):
    compat[f'/lib/assets/pwa/{p.name}'] = f'/assets/icons/{p.name}'
for p in Path('assets/splash').glob('splash-*.png'):
    compat[f'/lib/assets/pwa/{p.name}'] = f'/assets/splash/{p.name}'
for old, new in archived_blog_routes:
    compat[old] = new

existing_sources = {item.get('source') for item in vercel.get('rewrites', [])}
compat_rules = [{'source': src, 'destination': dst} for src, dst in compat.items() if src not in existing_sources]
vercel['rewrites'] = compat_rules + vercel.get('rewrites', [])
vercel_path.write_text(json.dumps(vercel, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

env_names = sorted({
    m.group(1)
    for p in list(Path('api').glob('*.js')) + list(Path('lib').glob('*.js'))
    for m in re.finditer(r'process\.env\.([A-Z0-9_]+)', p.read_text(encoding='utf-8'))
})
env_md = '\n'.join(f'- `{name}`' for name in env_names)
readme = f'''# Stellar AI

Stellar AI is an AI-assisted development workspace for building, organising, testing and refining Roblox Luau and FiveM/QBCore systems from plain-English requests. The web app combines project-oriented chat, selectable model power, account usage controls and Stripe-backed paid plans while keeping the public guides and product pages directly accessible.

**Live:** https://trystellarai.com

## Features

- Roblox Luau and FiveM/QBCore code generation
- Organised project files and project-based chat history
- Fast, Balanced, Deep and Max model-power modes
- Free and paid usage allowances with optional credit top-ups
- Google and Discord sign-in
- Stripe subscription and billing flows
- Web search support for eligible requests
- Installable PWA with mobile icons, splash screens and offline fallback
- Public FiveM, QBCore and Roblox guide library

## Tech stack

- Static HTML, CSS and vanilla JavaScript frontend
- Node.js Vercel Functions in `api/`
- Vercel hosting and PWA service worker
- Stripe for subscriptions, checkout and webhooks
- Redis-compatible REST/KV storage for account and usage state
- Google and Discord authentication
- Resend for transactional email
- Anthropic and configured AI/Forge providers
- Brave Search API for web-search requests

## Folder structure

```text
Stellar-AI/
├── api/                 # Vercel serverless API handlers
├── assets/
│   ├── css/             # Shared product stylesheets
│   ├── icons/           # PWA/app icons and favicon
│   ├── img/             # Product/social images
│   ├── js/              # Shared browser JavaScript
│   ├── splash/          # PWA launch images
│   └── styles.css       # Cacheable primary app stylesheet
├── blog/                # Canonical published guide pages
├── lib/                 # Shared server/runtime modules and auxiliary pages
├── scripts/             # Active maintenance/validation scripts
├── tests/               # Node test suite
├── archive/             # Superseded docs, source files and tooling
├── index.html           # Public landing page
├── app.html             # Main Stellar AI application
├── blog.html            # Guide index
├── affiliate.html       # Affiliate page
├── terms.html           # Terms and privacy
├── offline.html         # PWA offline fallback
├── manifest.json        # Web app manifest
├── sw.js                # Service worker
└── vercel.json          # Hosting routes and redirects
```

## Local setup

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Create a local `.env` file with the required variables listed below.
4. Start the Vercel-compatible local environment with `npx vercel dev`.
5. Run the test suite with `node --test tests/*.test.mjs`.

Static pages can be inspected without API credentials, but authentication, AI, search, storage, email and billing flows require their corresponding environment variables.

## Environment variables

Names only; never commit secret values.

{env_md}

## Licence

MIT — see [`LICENSE`](./LICENSE).
'''
Path('README.md').write_text(readme, encoding='utf-8')

Path('.gitignore').write_text('''node_modules/
.env
.env.*
!.env.example
.DS_Store
.vercel/
*.log
logs/
npm-debug.log*
''', encoding='utf-8')

Path('LICENSE').write_text('''MIT License

Copyright (c) 2026 Stellar AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
''', encoding='utf-8')

Path('CONTRIBUTING.md').write_text('''# Contributing to Stellar AI

Thanks for helping improve Stellar AI.

1. Create a focused branch from `main`.
2. Keep each change small and preserve existing public URLs and product behaviour unless a change explicitly requires otherwise.
3. Never commit `.env` files, API keys, tokens or other secrets.
4. Run `node --test tests/*.test.mjs` before opening a pull request.
5. In the pull request, explain what changed, why it is safe, and how it was verified.

For UI refactors, include a visual/interaction check and avoid unrelated style changes. For billing or authentication work, include focused regression coverage.
''', encoding='utf-8')

Path('tests/repository-structure.test.mjs').write_text(r'''import assert from 'node:assert/strict';
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
''', encoding='utf-8')

for temp in (
    Path('.github/workflows/repo-organize-audit.yml'),
    Path('.github/workflows/repo-organize-migrate.yml'),
    Path('scripts/_repo_organize_migrate.py'),
):
    if temp.exists():
        temp.unlink()
if Path('.github/workflows').exists() and not any(Path('.github/workflows').iterdir()):
    Path('.github/workflows').rmdir()
if Path('.github').exists() and not any(Path('.github').iterdir()):
    Path('.github').rmdir()

print(f'Extracted primary CSS bytes: {len(primary_css.encode("utf-8"))}')
print(f'Extracted inline style groups: {len(style_rules)}')
print(f'Archived duplicate blog files: {len(archived_blog_routes)}')
print(f'New app.html bytes: {Path("app.html").stat().st_size}')
print('Environment variables:', ', '.join(env_names))
