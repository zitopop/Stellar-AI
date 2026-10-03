#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const testsDir = join(process.cwd(), 'tests');
const quarantinePath = join(testsDir, 'quarantined-contracts.txt');

if (!existsSync(testsDir)) throw new Error('tests directory is missing');

const quarantine = new Set(
  existsSync(quarantinePath)
    ? readFileSync(quarantinePath, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
    : []
);

const all = readdirSync(testsDir)
  .filter(name => name.endsWith('.test.mjs'))
  .sort();

const current = all.filter(name => !quarantine.has(name));
if (!current.length) throw new Error('No current regression tests found.');

const unknown = [...quarantine].filter(name => !all.includes(name));
if (unknown.length) {
  throw new Error('Quarantine list references missing tests: ' + unknown.join(', '));
}

console.log(`Running ${current.length} current regression tests; ${quarantine.size} legacy contracts quarantined.`);

const failed = [];
for (const name of current) {
  const path = join(testsDir, name);
  try {
    execFileSync(process.execPath, ['--test', path], { stdio: 'inherit' });
  } catch {
    failed.push(name);
  }
}

if (failed.length) {
  console.error(`Current regression failures (${failed.length}):`);
  for (const name of failed) console.error(' - tests/' + name);
  process.exit(1);
}

console.log('Current Stellar regression suite passed.');
