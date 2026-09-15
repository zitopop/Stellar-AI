import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'app.html');
const ASSETS = path.join(ROOT, 'assets');
const moves = [];

const ROOT_FILES = new Set([
  'index.html','app.html','terms.html','blog.html','offline.html','affiliate.html',
  'manifest.json','vercel.json','sw.js','robots.txt','sitemap.xml','llms.txt',
  'README.md','package.json','package-lock.json','.gitignore','LICENSE','CONTRIBUTING.md',
]);
const ROOT_DIRS = new Set(['api','blog','lib','scripts','tests','assets','archive','.github','.git','node_modules']);
const IMAGE_EXTS = new Set(['.png','.jpg','.jpeg','.webp','.gif','.svg','.avif','.ico']);
const TEXT_EXTS = new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.md','.txt','.xml','.yml','.yaml','.toml','.ini','.env']);

function posix(p) { return p.split(path.sep).join('/'); }
function rel(p) { return posix(path.relative(ROOT, p)); }
function abs(p) { return path.join(ROOT, p); }
function exists(p) { return fs.existsSync(abs(p)); }
function mkdirFor(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}
function moveFile(oldRel, newRel, { publicUrl = false } = {}) {
  if (oldRel === newRel || !exists(oldRel)) return;
  const from = abs(oldRel), to = abs(newRel);
  mkdirFor(to);
  if (fs.existsSync(to)) {
    if (sha(from) !== sha(to)) throw new Error(`Refusing conflicting move ${oldRel} -> ${newRel}`);
    fs.rmSync(from);
  } else {
    fs.renameSync(from, to);
  }
  moves.push({ old: oldRel, new: newRel, publicUrl });
}
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
  for (const name of fs.readdirSync(dir)) {
    const child = path.join(dir, name);
    if (fs.statSync(child).isDirectory()) removeEmptyDirs(child);
  }
  if (dir !== ROOT && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
}
function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
}
function cssNeedleDecode(value) {
  return value.replace(/\\(["'])/g, '$1');
}
function splitStyleBlocks(html) {
  const blocks = [];
  const masked = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
    const token = `<!--__STELLAR_STYLE_BLOCK_${blocks.length}__-->`;
    blocks.push({ token, attrs, css, full });
    return token;
  });
  return { masked, blocks };
}
function addClassToTag(tag, className) {
  const classRe = /\sclass\s*=\s*(["'])([\s\S]*?)\1/i;
  if (classRe.test(tag)) {
    return tag.replace(classRe, (m, q, value) => ` class=${q}${value}${value.trim() ? ' ' : ''}${className}${q}`);
  }
  return tag.replace(/\s*\/?>$/, (end) => ` class="${className}"${end}`);
}
function transformTags(html) {
  const inline = [];
  let lazyAdded = 0;
  let tagCount = 0;
  const tagRe = /<[A-Za-z][A-Za-z0-9:-]*(?:\s+(?:"[^"]*"|'[^']*'|[^'">])*)?\s*\/?>/g;
  const out = html.replace(tagRe, (tag) => {
    tagCount += 1;
    let next = tag;
    const styleRe = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
    const styleMatch = next.match(styleRe);
    if (styleMatch) {
      const raw = decodeEntities(styleMatch[1] ?? styleMatch[2] ?? '');
      const className = `stellar-inline-${String(inline.length + 1).padStart(3, '0')}`;
      next = next.replace(styleRe, '');
      next = addClassToTag(next, className);
      inline.push({ className, style: raw });
    }
    const name = next.match(/^<([A-Za-z][A-Za-z0-9:-]*)/)?.[1]?.toLowerCase();
    if (name === 'img' && !/\sloading\s*=/i.test(next) && /\ssrc\s*=/i.test(next)) {
      const likelyAboveFold = /\b(?:logo|hero|brand|avatar)\b/i.test(next) || /\sfetchpriority\s*=\s*["']high["']/i.test(next);
      if (!likelyAboveFold) {
        next = next.replace(/\s*\/?>$/, (end) => ` loading="lazy"${end}`);
        lazyAdded += 1;
      }
    }
    return next;
  });
  return { html: out, inline, lazyAdded, tagCount };
}
function matchingInlineClasses(inline, needle) {
  const n = cssNeedleDecode(needle);
  return inline.filter((item) => item.style.includes(n)).map((item) => `.${item.className}`);
}
function augmentStyleSelectors(css, inline) {
  return css.replace(/([^{}]+)\{/g, (full, header) => {
    if (!header.includes('[style*=')) return full;
    const trimmed = header.trim();
    if (trimmed.startsWith('@')) return full;
    let changed = false;
    const alt = header.replace(/\[style\*=\s*(["'])(.*?)\1\]/g, (attr, q, needle) => {
      const classes = matchingInlineClasses(inline, needle);
      if (!classes.length) return attr;
      changed = true;
      return `:is(${classes.join(',')})`;
    });
    if (!changed || alt === header) return full;
    return `${header.trim()},\n${alt.trim()} {`;
  });
}
function inlineRules(inline) {
  if (!inline.length) return '';
  const lead = `\n\n/* Static inline declarations extracted from app.html.\n   The :is() ID alternatives recreate inline-style-level selector dominance without !important,\n   so later JavaScript element.style assignments can still override these declarations normally. */\n`;
  return lead + inline.map(({ className, style }) => {
    const selector = [1,2,3,4].map((n) => `:is(#_stellar-inline-specificity-${n},.${className})`).join('');
    const body = style.trim().replace(/;?\s*$/, ';');
    return `${selector}{${body}}`;
  }).join('\n') + '\n';
}

function refactorApp() {
  if (!fs.existsSync(APP)) throw new Error('app.html is missing');
  const original = fs.readFileSync(APP, 'utf8');
  const originalBytes = Buffer.byteLength(original);
  const { masked, blocks } = splitStyleBlocks(original);
  if (!blocks.length) throw new Error('No <style> blocks found in app.html');

  // Extract only the first/main stylesheet. Later override blocks stay exactly where they are,
  // preserving cascade order relative to the existing linked stylesheets and runtime.
  let working = masked.replace(blocks[0].token, '<link rel="stylesheet" href="/assets/styles.css">');
  const transformed = transformTags(working);
  working = transformed.html;

  const firstCss = augmentStyleSelectors(blocks[0].css, transformed.inline);
  const css = firstCss.trimEnd() + inlineRules(transformed.inline);
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.writeFileSync(path.join(ASSETS, 'styles.css'), css);

  for (let i = 1; i < blocks.length; i += 1) {
    const updatedCss = augmentStyleSelectors(blocks[i].css, transformed.inline);
    working = working.replace(blocks[i].token, `<style${blocks[i].attrs}>${updatedCss}</style>`);
  }

  fs.writeFileSync(APP, working);
  const remainingStyleAttrs = (working.match(/\sstyle\s*=\s*["']/gi) || []).length;
  if (remainingStyleAttrs !== 0) throw new Error(`app.html still contains ${remainingStyleAttrs} style= attributes`);
  if (transformed.inline.length === 0) throw new Error('No inline style attributes were extracted');
  const newBytes = Buffer.byteLength(working);
  console.log(JSON.stringify({
    appStyleBlocksFound: blocks.length,
    extractedMainStyleBytes: Buffer.byteLength(blocks[0].css),
    inlineStyleAttributesExtracted: transformed.inline.length,
    lazyImagesAdded: transformed.lazyAdded,
    appBytesBefore: originalBytes,
    appBytesAfter: newBytes,
    appBytesSaved: originalBytes - newBytes,
  }, null, 2));
}

function organiseImages() {
  const files = walk(ROOT);
  for (const file of files) {
    const oldRel = rel(file);
    if (oldRel.startsWith('archive/') || oldRel.startsWith('assets/')) continue;
    const ext = path.extname(file).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    const base = path.basename(file);
    let newRel;
    if (/^icon-.*\.png$/i.test(base)) newRel = `assets/icons/${base}`;
    else if (/^splash-.*\.png$/i.test(base)) newRel = `assets/splash/${base}`;
    else {
      let suffix = base;
      if (oldRel.startsWith('blog/')) suffix = `blog/${base}`;
      newRel = `assets/img/${suffix}`;
    }
    moveFile(oldRel, newRel, { publicUrl: true });
  }
}
function organiseRootFiles() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (ROOT_FILES.has(entry.name) || ROOT_DIRS.has(entry.name)) continue;
    const oldRel = entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'docs') {
        for (const file of walk(abs('docs'))) {
          const suffix = posix(path.relative(abs('docs'), file));
          moveFile(rel(file), `archive/docs/repository-notes/${suffix}`);
        }
        removeEmptyDirs(abs('docs'));
        continue;
      }
      for (const file of walk(abs(entry.name))) {
        const suffix = posix(path.relative(abs(entry.name), file));
        moveFile(rel(file), `archive/legacy-folders/${entry.name}/${suffix}`);
      }
      removeEmptyDirs(abs(entry.name));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.css') moveFile(oldRel, `assets/css/${entry.name}`, { publicUrl: true });
    else if (ext === '.js' && entry.name !== 'sw.js') moveFile(oldRel, `assets/js/${entry.name}`, { publicUrl: true });
    else if (['.mjs','.cjs','.py','.sh'].includes(ext)) moveFile(oldRel, `scripts/legacy/${entry.name}`);
    else if (ext === '.html' || (ext === '' && fs.readFileSync(abs(oldRel), 'utf8').trimStart().startsWith('<'))) {
      moveFile(oldRel, `lib/pages/${entry.name}`, { publicUrl: true });
    } else if (ext === '.json') moveFile(oldRel, `lib/config/${entry.name}`);
    else if (['.md','.txt'].includes(ext)) moveFile(oldRel, `archive/docs/root-notes/${entry.name}`);
    else moveFile(oldRel, `archive/misc/${entry.name}`, { publicUrl: true });
  }
}
function replacePathRefs(text, oldRel, newRel) {
  const oldAbs = `/${oldRel}`;
  const newAbs = `/${newRel}`;
  let out = text.split(oldAbs).join(newAbs);
  out = out.split(oldRel).join(newRel);
  return out;
}
function updateReferences() {
  const files = walk(ROOT);
  for (const file of files) {
    const r = rel(file);
    if (r === 'vercel.json' || r.startsWith('archive/')) continue;
    const ext = path.extname(file).toLowerCase();
    if (!TEXT_EXTS.has(ext) && !['.gitignore','LICENSE'].includes(path.basename(file))) continue;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    let next = text;
    for (const move of moves) next = replacePathRefs(next, move.old, move.new);
    if (next !== text) fs.writeFileSync(file, next);
  }
}
function updateVercel() {
  if (!exists('vercel.json')) return;
  const file = abs('vercel.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const replaceDestination = (value) => {
    if (typeof value !== 'string') return value;
    let out = value;
    for (const move of moves) out = out.split(`/${move.old}`).join(`/${move.new}`);
    return out;
  };
  for (const key of ['redirects','rewrites']) {
    if (!Array.isArray(config[key])) continue;
    for (const rule of config[key]) {
      if (typeof rule.destination === 'string') rule.destination = replaceDestination(rule.destination);
    }
  }
  if (!Array.isArray(config.rewrites)) config.rewrites = [];
  const occupied = new Set([
    ...(config.redirects || []).map((r) => r.source),
    ...(config.rewrites || []).map((r) => r.source),
  ]);
  for (const move of moves.filter((m) => m.publicUrl)) {
    const source = `/${move.old}`;
    const destination = `/${move.new}`;
    if (source === destination || occupied.has(source)) continue;
    config.rewrites.push({ source, destination });
    occupied.add(source);
  }
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
}
function environmentNames() {
  const names = new Set();
  for (const file of walk(ROOT)) {
    const r = rel(file);
    if (r.startsWith('archive/')) continue;
    const ext = path.extname(file).toLowerCase();
    if (!['.js','.mjs','.cjs'].includes(ext)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) names.add(m[1]);
    for (const m of text.matchAll(/process\.env\[['"]([A-Z0-9_]+)['"]\]/g)) names.add(m[1]);
  }
  return [...names].sort();
}
function writeStandardFiles() {
  fs.writeFileSync(abs('.gitignore'), `node_modules/\n.env\n.env.*\n!.env.example\n.DS_Store\n.vercel/\n*.log\nlogs/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\npnpm-debug.log*\n`);
  fs.writeFileSync(abs('LICENSE'), `MIT License\n\nCopyright (c) 2026 Stellar AI\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`);
  fs.writeFileSync(abs('CONTRIBUTING.md'), `# Contributing to Stellar AI\n\nThanks for helping improve Stellar AI. Keep changes focused, preserve existing routes and behaviour unless a change is explicitly requested, and include tests for behaviour you change.\n\n1. Create a branch from \`main\`.\n2. Make the smallest focused change possible.\n3. Run \`node --test tests/*.test.mjs\`.\n4. Confirm affected pages and PWA assets still resolve.\n5. Open a pull request describing what changed, why, and how it was verified.\n\nDo not commit secrets, \`.env\` files, generated logs, or credentials.\n`);

  const env = environmentNames();
  const readme = `# Stellar AI\n\nStellar AI is a web-based AI workspace for building and debugging Roblox Luau and FiveM/QBCore projects from plain-English instructions, with project-oriented chats, selectable model power, account usage controls, image-assisted workflows, and paid plans handled through secure checkout.\n\n**Live:** https://trystellarai.com\n\n## Features\n\n- Roblox Luau and FiveM/QBCore code generation and debugging\n- Project-based chat workspace with saved conversations\n- Multiple AI model/power modes for speed, depth, and maximum-quality work\n- Image upload and generated-image support\n- Google and Discord sign-in flows\n- Usage, plan, referral, reward, and account controls\n- Stripe subscriptions and credit top-ups\n- PWA support with install icons, splash assets, offline fallback, and service-worker caching\n- 74 published technical guides under \`/blog/\`\n\n## Tech stack\n\n- Static HTML, CSS, and browser JavaScript\n- Node.js ES modules for server-side utilities and tests\n- Vercel Serverless Functions and routing\n- Supabase\n- Stripe\n- Google Identity and Discord OAuth\n- Node.js built-in test runner\n\n## Repository structure\n\n\`\`\`text\n.\n├── api/          # Vercel serverless endpoints\n├── assets/       # Browser assets\n│   ├── css/\n│   ├── icons/\n│   ├── img/\n│   ├── js/\n│   └── splash/\n├── blog/         # Published guide pages\n├── lib/          # Shared runtime modules and moved supporting pages/config\n├── scripts/      # Repository and release utilities\n├── tests/        # Node test suite\n├── archive/      # Superseded, legacy, and one-off material\n├── app.html      # Main Stellar AI application\n├── index.html    # Marketing/home page\n├── blog.html     # Blog hub\n├── affiliate.html\n├── terms.html\n├── offline.html\n├── manifest.json\n├── vercel.json\n├── sw.js\n├── robots.txt\n├── sitemap.xml\n└── llms.txt\n\`\`\`\n\n> Repository metadata such as \`.github/\`, \`.gitignore\`, \`LICENSE\`, and \`CONTRIBUTING.md\` remains at the repository root because GitHub and standard tooling require or conventionally expect it there.\n\n## Local setup\n\n\`\`\`bash\ngit clone https://github.com/zitopop/Stellar-AI.git\ncd Stellar-AI\nnpm ci\nnode --test tests/*.test.mjs\n\`\`\`\n\nFor local browser testing, serve the repository root with any static HTTP server so absolute asset paths resolve correctly. API routes require the relevant environment variables and a Vercel-compatible serverless environment.\n\n## Environment variables\n\n${env.length ? env.map((name) => `- \`${name}\``).join('\n') : '- None detected'}\n\nEnvironment variable values are intentionally not documented in this repository.\n\n## Licence\n\nMIT — see \`LICENSE\`.\n`;
  fs.writeFileSync(abs('README.md'), readme);
}
function verifyStructure() {
  const errors = [];
  const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true }).map((e) => e.name).filter((n) => !['.git','node_modules'].includes(n));
  for (const name of rootEntries) {
    if (!ROOT_FILES.has(name) && !ROOT_DIRS.has(name)) errors.push(`Unexpected root entry: ${name}`);
  }
  for (const required of ['assets/styles.css','assets/icons','assets/splash','assets/img']) {
    if (!exists(required)) errors.push(`Missing ${required}`);
  }
  const app = fs.readFileSync(APP, 'utf8');
  if (!app.includes('/assets/styles.css')) errors.push('app.html does not load /assets/styles.css');
  if (/\sstyle\s*=\s*["']/i.test(app)) errors.push('app.html still has style= attributes');
  const manifest = JSON.parse(fs.readFileSync(abs('manifest.json'), 'utf8'));
  for (const icon of manifest.icons || []) {
    const p = String(icon.src || '').split('?')[0].replace(/^\//, '');
    if (p && !exists(p)) errors.push(`Manifest icon missing: ${icon.src}`);
  }
  const sitemap = fs.readFileSync(abs('sitemap.xml'), 'utf8');
  const blogUrls = [...sitemap.matchAll(/<loc>\s*(https:\/\/trystellarai\.com\/blog\/[^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (blogUrls.length !== 74 || new Set(blogUrls).size !== 74) errors.push(`Expected 74 blog URLs, found ${blogUrls.length}/${new Set(blogUrls).size} unique`);
  for (const url of blogUrls) {
    const slug = url.split('/').filter(Boolean).at(-1);
    if (!exists(`blog/${slug}.html`)) errors.push(`Blog file missing for ${url}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Structure verified. Blog files: ${blogUrls.length}/74. Manifest icons: ${(manifest.icons || []).length}.`);
}

refactorApp();
organiseImages();
organiseRootFiles();
updateReferences();
updateVercel();
writeStandardFiles();
removeEmptyDirs(path.join(ROOT, 'lib', 'assets'));
verifyStructure();
console.log(`Moved ${moves.length} files into organised locations.`);
for (const m of moves) console.log(`MOVE ${m.old} -> ${m.new}`);
