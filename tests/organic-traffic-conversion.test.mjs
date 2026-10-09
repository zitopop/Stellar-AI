import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const homepageJs = readFileSync(new URL('../lib/assets/homepage.js', import.meta.url), 'utf8');

test('Google-facing workspace snippet explains the free coding offer without overclaiming', () => {
  assert.match(app, /<title>Stellar AI \| Free AI Chat, Coding &amp; Script Generator<\/title>/);
  assert.match(app, /<meta name="description" content="Try Stellar AI free to write, plan, debug code and draft Roblox Luau or FiveM Lua scripts\./);
  assert.match(app, /<link rel="canonical" href="https:\/\/trystellarai\.com\/app">/);
});

test('Homepage links to existing intent-specific Roblox and FiveM routes', () => {
  assert.match(home, /href="\/roblox-script-generator">Roblox Luau scripts<\/a>/);
  assert.match(home, /href="\/fivem-ai-script-generator-free">FiveM Lua scripts<\/a>/);
  assert.match(home, /href="\/ai-game-script-generator">All game scripts<\/a>/);
  assert.match(home, /id="anonymous-preview-form"/);
  assert.match(home, /3 free previews · no card required/);
});

test('Sample script prompt prefills only, with explicit consent to generate', () => {
  assert.match(home, /id="anonymous-preview-example"[^>]*type="button"/);
  assert.match(homepageJs, /const example = \$\('#anonymous-preview-example'\)/);
  assert.match(homepageJs, /example\?\.addEventListener\('click',/);
  assert.match(homepageJs, /input\.value = 'Create a Roblox Studio Luau coin pickup Script\./);
  assert.match(homepageJs, /form\.addEventListener\('submit', async/);
  assert.doesNotMatch(homepageJs.match(/example\?\.addEventListener\('click',[\s\S]*?\n    \}\);/)?.[0] || '', /fetch\(|submit\(/);
});
