import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const chatCss = await readFile(new URL('../stellar-chatgpt-layout.css', import.meta.url), 'utf8');

test('start-state class only covers empty home and intro assistant response', () => {
  assert.match(appHtml, /const isEmptyHome = chat\.messages\.length === 0;/);
  assert.match(appHtml, /const isIntroResponse = chat\.messages\.length === 1 && chat\.messages\[0\]\?\.role !== 'user';/);
  assert.match(appHtml, /classList\.toggle\('stellar-start-state', isEmptyHome \|\| isIntroResponse\);/);
});

test('composer is centred for the opening state and docks after conversation grows', () => {
  assert.match(chatCss, /body\.stellar-start-state \.stellar-app-shell \.input-area\.glass\{[\s\S]*top:56%!important;[\s\S]*bottom:auto!important;[\s\S]*transform:translateY\(-50%\)!important;/);
  assert.match(chatCss, /body:not\(\.stellar-start-state\) \.stellar-app-shell \.input-area\.glass\{[\s\S]*top:auto!important;[\s\S]*bottom:0!important;[\s\S]*transform:none!important;/);
});

test('opening copy is deliberately held high and chat title cannot stack vertically', () => {
  assert.match(chatCss, /body\.stellar-empty-home \.greet-wrap\{[\s\S]*justify-content:flex-start!important;/);
  assert.match(chatCss, /\.topbar #chat-title\{[\s\S]*white-space:nowrap!important;[\s\S]*text-overflow:ellipsis!important;/);
});


test('fresh draft and signed-out home explicitly enter the centered start state', () => {
  assert.match(appHtml, /<body class="text\[#e2e8f0\] stellar-empty-home stellar-start-state">/);
  const adds = appHtml.match(/classList\.add\('stellar-empty-home', 'stellar-start-state'\);/g) || [];
  assert.ok(adds.length >= 2, 'new draft and signed-out home should both restore start-state classes');
});
