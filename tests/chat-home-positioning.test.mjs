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
  assert.match(appHtml, /<body class="[^"]*stellar-empty-home[^"]*stellar-start-state[^"]*">/);
  const adds = appHtml.match(/classList\.add\('stellar-empty-home', 'stellar-start-state'\);/g) || [];
  assert.ok(adds.length >= 2, 'new draft and signed-out home should both restore start-state classes');
});


test('final inline layout centers on the viewport independent of sidebar width', () => {
  assert.match(appHtml, /stellar-chatgpt-layout\.css\?v=4/);
  assert.match(appHtml, /<style id="stellar-final-centered-home-v2">[\s\S]*body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*position:fixed!important;[\s\S]*top:50dvh!important;[\s\S]*left:50%!important;[\s\S]*bottom:auto!important;[\s\S]*transform:translate\(-50%,-50%\)!important;/);
  assert.match(appHtml, /body\.stellar-start-state\.stellar-empty-home #chat\{[\s\S]*top:10%!important;/);
});


test('mobile start composer stays centered on the viewport', () => {
  assert.match(appHtml, /@media\(max-width:640px\)\{[\s\S]*body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*top:50dvh!important;[\s\S]*width:calc\(100vw - 16px\)!important;/);
});


test('final centered composer selector beats generic main-column positioning rules', () => {
  assert.match(appHtml, /#main-col > \*\{[\s\S]*position:relative!important;/);
  assert.match(appHtml, /body\.stellar-start-state #main-col > \.input-area\.glass\{[\s\S]*position:fixed!important;/);
});


test('app resumes the active conversation and keeps New project as the fresh-home action', () => {
  assert.match(appHtml, /renderChatList\(\);\s*\/\/ Keep the active conversation across reloads\.[^\n]*\s*restoreCurrentChat\(\);/);
  assert.match(appHtml, /onclick="newChat\(\)"/);
});


test('premium home stays minimal and keeps the composer at the true viewport centre', () => {
  assert.match(appHtml, /<style id="stellar-home-premium-polish-v1">[\s\S]*top:50dvh!important;[\s\S]*left:50%!important;[\s\S]*transform:translate\(-50%,-50%\)!important;/);
  assert.match(appHtml, /<span class="greet-eyebrow-label">Stellar AI<\/span>/);
  assert.ok(appHtml.includes('What are we working on?'));
  assert.ok(appHtml.includes('Create project files, debug code, improve a system, or plan the next release.'));
  assert.match(appHtml, /placeholder="Ask Stellar anything…"/);
});

test('home layout v2 is the final cascade layer and preserves centered composition', () => {
  assert.match(appHtml, /<style id="stellar-home-layout-v2">[\s\S]*#main-col>\.input-area\.glass\{[\s\S]*top:50dvh!important;[\s\S]*left:50%!important;[\s\S]*transform:translate\(-50%,-50%\)!important;/);
  assert.match(appHtml, /#chat \.welcome-sub\{[\s\S]*display:block!important;/);
  assert.match(appHtml, /#sidebar \.side-new\{[\s\S]*display:flex!important;/);
  assert.match(appHtml, /#sidebar #chats-list\{[\s\S]*display:block!important;/);
  assert.match(appHtml, /\.composer-foot #composer-plans-btn\{[\s\S]*display:none!important;/);
  assert.ok(appHtml.lastIndexOf('stellar-home-layout-v2') > appHtml.lastIndexOf('home-calm-performance-final'));
});
