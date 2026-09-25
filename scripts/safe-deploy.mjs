#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const yes = args.has('--yes');

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: opts.stdio || ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(message) {
  console.error(`\nSAFE DEPLOY BLOCKED: ${message}`);
  console.error('No Vercel deployment was started.');
  process.exit(1);
}
let head = '';
let upstream = '';
let status = '';
try {
  head = run('git', ['rev-parse', 'HEAD']);
  upstream = run('git', ['rev-parse', '@{u}']);
  status = run('git', ['status', '--porcelain']);
} catch (error) {
  fail(`Git check failed: ${error.message}`);
}

if (status && !force) {
  fail('working tree has uncommitted files. Commit/test first, or rerun with --force.');
}
if (head !== upstream && !force) {
  fail('local HEAD is not the pushed GitHub main commit. Push first, or rerun with --force.');
}
console.log('Safe deploy checklist');
console.log(`- Commit: ${head.slice(0, 12)}`);
console.log('- Tests: run `npm run check` before production deploys.');
console.log('- Vercel: this command performs exactly one production deploy.');

if (!yes && !force) {
  fail('confirmation missing. Use `npm run deploy:safe -- --yes` after tests pass.');
}

const deploy = spawnSync('vercel', ['deploy', '--prod'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (deploy.status !== 0) {
  process.exit(deploy.status || 1);
}
