import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-smooth-smart.css', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('legacy space visual layer contains no fake mockup people', () => {
  assert.match(css, /Stellar OpenAI-space theme v20260925/);
  assert.doesNotMatch(app + landing + css, /Alex Carter|alex@stellar\.ai/);
});

test('app home stays chat-first and exposes real reviewed Computer and Plugins entry points', () => {
  assert.match(app, /What can I help with\?/);
  assert.match(app, /function openComputerActionCard\(\)/);
  assert.match(app, />▣ StellarX<\/button>/);
  assert.match(app, /href="\/plugins">Plugins<\/a>/);
  assert.match(app, /Review computer action/);
  assert.match(app, /Check the task before handing it to StellarX/);
});
