import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'dist-static', 'build', 'coverage']);
const textExts = new Set(['.html', '.js', '.mjs', '.css', '.json', '.md', '.txt', '.xml']);
const deployTriggerPatterns = [
  /^deploy-trigger-.*\.txt$/i,
  /^vercel-deploy-trigger-.*\.txt$/i,
  /^\.vercel-restore-trigger\.txt$/i,
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(root);
const rootFiles = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);

const errors = [];
for (const file of rootFiles) {
  if (deployTriggerPatterns.some((pattern) => pattern.test(file))) {
    errors.push(`root deploy-trigger file must be archived: ${file}`);
  }
}

const searchable = files.filter((file) => {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  return !rel.startsWith('archive/') && textExts.has(path.extname(file));
});

for (const file of rootFiles.filter((name) => /\.(?:css|js)$/i.test(name))) {
  const source = path.join(root, file);
  let refs = 0;
  for (const target of searchable) {
    if (target === source) continue;
    const content = fs.readFileSync(target, 'utf8');
    if (content.includes(file)) refs += 1;
  }
  if (refs === 0) errors.push(`unreferenced root browser asset: ${file}`);
}

if (errors.length) {
  console.error('Repository hygiene audit failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository hygiene audit passed. Root files: ${rootFiles.length}.`);
