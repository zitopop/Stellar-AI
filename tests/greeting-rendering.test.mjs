import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const staticAppMarkup = appHtml.split('function timeGreeting()')[0];

test('workspace keeps the build question stable while the small greeting updates by time', () => {
  assert.match(appHtml, /<div class="greet-hi" id="greet-hi">What do you want to <span class="greet-hi-accent">build\?<\/span><\/div>/);
  assert.match(appHtml, /function syncHomeGreeting\(\)/);
  assert.match(appHtml, /label\.textContent = timeGreeting\(\) \+ ' · FiveM & Roblox';/);
  assert.doesNotMatch(staticAppMarkup, /<div class="greet-hi" id="greet-hi">\$\{timeGreeting\(\)\}<\/div>/);
});

test('greeting function remains available for the current user and time', () => {
  assert.match(appHtml, /function timeGreeting\(\) \{/);
  assert.match(appHtml, /if \(h >= 5 && h < 12\) hi = 'Good morning';/);
  assert.match(appHtml, /else if \(h >= 12 && h < 17\) hi = 'Good afternoon';/);
  assert.match(appHtml, /else if \(h >= 17 && h < 21\) hi = 'Good evening';/);
});
