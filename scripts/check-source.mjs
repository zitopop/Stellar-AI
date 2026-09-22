import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const roots = ['api', 'lib', 'scripts'];
const rootFiles = ['currency.js', 'sw.js', 'stellar-growth-v1.js'];
const files = [];

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (['.js', '.mjs'].includes(extname(path))) files.push(path);
  }
}

for (const root of roots) walk(root);
for (const file of rootFiles) if (existsSync(file)) files.push(file);

if (!files.length) throw new Error('No JavaScript source files found.');

for (const file of [...new Set(files)].sort()) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
console.log(`Syntax checked ${new Set(files).size} source files.`);
