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


test('final inline layout wins over older bottom-dock home rules', () => {
  assert.match(appHtml, /stellar-chatgpt-layout\.css\?v=4/);
  assert.match(appHtml, /<style id="stellar-final-centered-home-v1">[\s\S]*body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*position:fixed!important;[\s\S]*top:50dvh!important;[\s\S]*left:260px!important;[\s\S]*bottom:auto!important;[\s\S]*transform:translateY\(-50%\)!important;/);
  assert.match(appHtml, /body\.stellar-start-state\.stellar-empty-home #chat\{[\s\S]*top:10%!important;/);
});


test('responsive start composer stays centered on the viewport', () => {
  assert.match(appHtml, /@media\(max-width:900px\)\{[\s\S]*body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*top:50dvh!important;[\s\S]*left:232px!important;/);
  assert.match(appHtml, /@media\(max-width:640px\)\{[\s\S]*body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*top:50dvh!important;[\s\S]*left:0!important;/);
});


test('final centered composer selector beats generic main-column positioning rules', () => {
  assert.match(appHtml, /#main-col > \*\{[\s\S]*position:relative!important;/);
  assert.match(appHtml, /body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*position:fixed!important;/);
});
