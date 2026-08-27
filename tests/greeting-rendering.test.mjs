import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const staticAppMarkup = appHtml.split('function timeGreeting()')[0];

test('workspace greeting has a safe static fallback and runtime time-based rendering', () => {
  assert.match(appHtml, /<div class="greet-hi" id="greet-hi">Welcome to Stellar AI<\/div>/);
  assert.match(appHtml, /const gh = document\.getElementById\('greet-hi'\);\s+if \(gh\) gh\.textContent = timeGreeting\(\);/);
  assert.doesNotMatch(staticAppMarkup, /<div class="greet-hi" id="greet-hi">\$\{timeGreeting\(\)\}<\/div>/);
});

test('greeting function remains available for the current user and time', () => {
  assert.match(appHtml, /function timeGreeting\(\) \{/);
  assert.match(appHtml, /if \(h >= 5 && h < 12\) hi = 'Good morning';/);
  assert.match(appHtml, /else if \(h >= 12 && h < 17\) hi = 'Good afternoon';/);
  assert.match(appHtml, /else if \(h >= 17 && h < 21\) hi = 'Good evening';/);
});
