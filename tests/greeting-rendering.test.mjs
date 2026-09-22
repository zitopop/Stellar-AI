import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const staticAppMarkup = appHtml.split('function timeGreeting()')[0];

test('workspace keeps the help question stable while signed-in greeting personalises safely', () => {
  assert.match(appHtml, /<div class="greet-hi" id="greet-hi">What are we working on\?<\/div>/);
  assert.match(appHtml, /function syncHomeGreeting\(\)/);
  assert.match(appHtml, /label\.textContent = firstName \? 'Welcome back · Stellar AI' : 'Stellar AI';/);
  assert.match(appHtml, /heading\.textContent = firstName[\s\S]*?firstName \+ ', what are we working on\?'[\s\S]*?: 'What are we working on\?';/);
  assert.doesNotMatch(staticAppMarkup, /\$\{timeGreeting\(\)\}/);
});

test('home greeting uses the signed-in first name without exposing the full email', () => {
  assert.match(appHtml, /function homeFirstName\(\) \{/);
  assert.match(appHtml, /String\(user\.email\)\.split\('@'\)\[0\]/);
  assert.match(appHtml, /firstName\.length > 18/);
  assert.doesNotMatch(appHtml, /function timeGreeting\(\)/);
});