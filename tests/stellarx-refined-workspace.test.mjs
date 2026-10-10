import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('desktop-agent.html');
const js=read('lib/assets/stellarx-refined.js');
const css=read('lib/assets/stellarx-refined.css');
const existing=read('lib/assets/stellarx-conversation.js');

test('refined layout loads after chat and history components',()=>{
 assert.match(html,/stellarx-workspace-ui\.css[\s\S]*stellarx-refined\.css/);
 assert.match(html,/stellarx-workspace-ui\.js[\s\S]*stellarx-refined\.js/);
 assert.match(js,/actions\.insertBefore\(tabs,send\)/);
 assert.match(css,/grid-template-columns:270px/);
 assert.match(css,/sx-side-collapsed/);
});

test('starter suggestions are interactive and preserve explicit PC workflow',()=>{
 assert.match(js,/starters\.forEach/);
 assert.match(js,/prompt\.value=item\.prompt/);
 assert.match(js,/data-sx-mode="computer"/);
 assert.match(existing,/await originalComputerTask\?\.\(\)/);
 assert.match(existing,/mode==='computer'/);
});

test('sidebar search, navigation, and theme are functional',()=>{
 assert.match(js,/id='sxHistorySearch'/);
 assert.match(js,/new MutationObserver\(filterChats\)/);
 assert.match(js,/key\.toLowerCase\(\)==='k'/);
 assert.match(js,/stellarx-appearance-v1/);
 assert.match(js,/aria-pressed/);
 assert.match(css,/data-sx-theme="light"/);
 assert.match(css,/@media\(max-width:850px\)/);
});

test('does not create unapproved PC actions or unsafe HTML rendering',()=>{
 assert.doesNotMatch(js,/\/api\/desktop-agent\?action=enqueue/);
 assert.doesNotMatch(js,/eval\(/);
 assert.match(existing,/greeting\(text\)/);
});
