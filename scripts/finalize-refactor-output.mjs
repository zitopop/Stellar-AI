import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TEXT_EXTS = new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.md','.txt','.xml','.yml','.yaml']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'archive') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

// The first refactor pass intentionally works from the untouched repository each run.
// Correct two path-rewrite edge cases here without touching application behaviour:
// 1) the extensionless public `models` page name must never rewrite JS identifiers/copy;
// 2) a root asset filename must be rewritten only once, not once as `/name` and again as `name`.
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === 'vercel.json' || rel === 'README.md') continue;
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXTS.has(ext)) continue;
  let text = fs.readFileSync(file, 'utf8');
  let next = text
    .replaceAll('lib/pages/models', 'models')
    .replaceAll('assets/js/assets/js/', 'assets/js/')
    .replaceAll('assets/css/assets/css/', 'assets/css/')
    .replaceAll('assets/img/assets/img/', 'assets/img/')
    .replaceAll('assets/icons/assets/icons/', 'assets/icons/')
    .replaceAll('assets/splash/assets/splash/', 'assets/splash/');
  if (next !== text) fs.writeFileSync(file, next);
}

// Keep the public /models and /models.html URLs intact while routing them to the moved files.
const vercelPath = path.join(ROOT, 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
for (const group of ['redirects','rewrites']) {
  for (const rule of vercel[group] || []) {
    if (typeof rule.destination !== 'string') continue;
    rule.destination = rule.destination
      .replaceAll('/lib/pages/lib/pages/', '/lib/pages/')
      .replaceAll('/assets/js/assets/js/', '/assets/js/')
      .replaceAll('/assets/css/assets/css/', '/assets/css/')
      .replaceAll('/assets/img/assets/img/', '/assets/img/');
  }
}
fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n');

function updateTest(fileName, transform) {
  const file = path.join(ROOT, 'tests', fileName);
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`Expected test adaptation did not apply: ${fileName}`);
  fs.writeFileSync(file, after);
}

// Tests that inspected CSS inside app.html now inspect the loaded external stylesheet as well.
updateTest('app-image-upload.test.mjs', (source) => source
  .replace(
    "const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');",
    "const appHtml = [await readFile(new URL('../app.html', import.meta.url), 'utf8'), await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8')].join('\\n');"
  )
  .replace(
    'class=\\"set-item set-click\\" id=\\"set-owner-row\\" role=\\"button\\" tabindex=\\"0\\" aria-haspopup=\\"dialog\\" onclick=\\"openOwner\\\\(\\\\)\\" onkeydown=\\"if \\\\(event\\\\.key === \'Enter\' \\\\|\\\\| event\\\\.key === \' \'\\\\) \\\\{ event\\\\.preventDefault\\\\(\\\\); openOwner\\\\(\\\\); \\\\}\\" style=\\"display:none\\"',
    'class=\\"set-item set-click stellar-inline-[0-9]+\\" id=\\"set-owner-row\\" role=\\"button\\" tabindex=\\"0\\" aria-haspopup=\\"dialog\\" onclick=\\"openOwner\\\\(\\\\)\\" onkeydown=\\"if \\\\(event\\\\.key === \'Enter\' \\\\|\\\\| event\\\\.key === \' \'\\\\) \\\\{ event\\\\.preventDefault\\\\(\\\\); openOwner\\\\(\\\\); \\\\}\\"'
  )
  .replace(
    'class=\\"side-new w-full\\" style=\\"font-size:12px;padding:8px 12px;\\"',
    'class=\\"side-new w-full stellar-inline-[0-9]+\\"'
  )
);

// Exact class-string assertions are widened only to permit the generated extracted-style class.
updateTest('plan-alignment.test.mjs', (source) => source
  .replace('id=\\"plan-card-${plan}\\" class=\\"plan-card\\"', 'id=\\"plan-card-${plan}\\" class=\\"plan-card(?: stellar-inline-[0-9]+)?\\"')
  .replace(/class=\\"plan-head-name\\"\/g/g, 'class=\\"plan-head-name(?: stellar-inline-[0-9]+)?\\"/g')
  .replace(/class=\\"plan-head-price\\"\/g/g, 'class=\\"plan-head-price(?: stellar-inline-[0-9]+)?\\"/g')
  .replace(/class=\\"plan-head-per\\"\/g/g, 'class=\\"plan-head-per(?: stellar-inline-[0-9]+)?\\"/g')
  .replace(/class=\\"plan-fit-line plan-head-fit\\"\/g/g, 'class=\\"plan-fit-line plan-head-fit(?: stellar-inline-[0-9]+)?\\"/g')
  .replace(/class=\\"plan-features\\"\/g/g, 'class=\\"plan-features(?: stellar-inline-[0-9]+)?\\"/g')
);

// Image URLs deliberately changed to their new /assets/img/ locations.
updateTest('landing-cta.test.mjs', (source) => source
  .replaceAll('\\/lib\\/assets\\/stellar-strike-thumb\\.png', '\\/assets\\/img\\/stellar-strike-thumb\\.png')
  .replaceAll('\\/lib\\/assets\\/stellar-simulator-thumb\\.png', '\\/assets\\/img\\/stellar-simulator-thumb\\.png')
);

// Preserve the support-link contract while validating the extracted class/style rather than style= markup.
updateTest('public-release-contract.test.mjs', (source) => source
  .replace("const appHtml = read('app.html');", "const appHtml = read('app.html');\nconst appStyles = read('assets/styles.css');")
  .replace(
    "  assert.match(appHtml, /href=\\\"mailto:support@trystellarai\\.com\\\"[^>]*white-space:nowrap[^>]*>support@trystellarai\\.com<\\/a>/);",
    "  const supportLink = appHtml.match(/<a href=\\\"mailto:support@trystellarai\\.com\\\"[^>]*class=\\\"([^\\\"]+)\\\"[^>]*>support@trystellarai\\.com<\\/a>/);\n  assert.ok(supportLink);\n  const supportStyleClass = supportLink[1].split(/\\s+/).find((name) => name.startsWith('stellar-inline-'));\n  assert.ok(supportStyleClass);\n  assert.match(appStyles, new RegExp(`\\\\.${supportStyleClass}[^{}]*\\\\{[^}]*white-space:nowrap`));"
  )
);

// The generated README must not recommend npm ci while the pre-existing lockfile is intentionally left unchanged.
const readmePath = path.join(ROOT, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme.replace(
  'npm ci\nnode --test tests/*.test.mjs',
  'npm install --package-lock=false --ignore-scripts --no-audit --no-fund\nnode --test tests/*.test.mjs'
);
readme = readme.replace(
  'For local browser testing, serve the repository root with any static HTTP server so absolute asset paths resolve correctly.',
  'The committed lockfile predates the current dependency declarations, so verification installs dependencies without rewriting it. For local browser testing, serve the repository root with any static HTTP server so absolute asset paths resolve correctly.'
);
fs.writeFileSync(readmePath, readme);

console.log('Applied path-safe reference corrections and refactor-aware test adaptations.');
