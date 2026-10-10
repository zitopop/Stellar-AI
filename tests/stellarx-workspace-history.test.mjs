import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../desktop-agent.html',import.meta.url),'utf8');
const chat=readFileSync(new URL('../lib/assets/stellarx-conversation.js',import.meta.url),'utf8');
const work=readFileSync(new URL('../lib/assets/stellarx-workspace-ui.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellarx-workspace-ui.css',import.meta.url),'utf8');

test('StellarX desktop and mobile receive premium chat workspace',()=>{
 assert.match(html,/stellarx-workspace-ui\.css/);
 assert.match(html,/stellarx-workspace-ui\.js/);
 assert.match(work,/id='sxWorkspaceSidebar'/);
 assert.match(work,/id='sxSidebarToggle'/);
 assert.match(work,/id="sxSavedChats"/);
 assert.match(css,/grid-template-columns:248px/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.match(css,/sx-menu-open/);
});
test('Chat history remains local, account-scoped, and deletable',()=>{
 assert.match(work,/crypto\.subtle\.digest\('SHA-256'/);
 assert.match(work,/Chats saved in this browser only/);
 assert.match(work,/Delete this chat from this browser/);
 assert.match(work,/localStorage\.setItem\(storageKey/);
 assert.match(chat,/window\.StellarXConversation/);
 assert.match(chat,/stellarx:messages-change/);
});
test('Computer mode maintains its reviewed planner boundaries',()=>{
 assert.match(chat,/await originalComputerTask\?\.\(\)/);
 assert.match(chat,/const intent=desktopRequest\(text\)/);
 assert.match(chat,/intent==='task'/);
 assert.match(chat,/setMode\(prompt\.value\.trim\(\)\?'computer':'chat'\)/);
 assert.match(chat,/window\.stellarxFormatMessage/);
});
test('Model text uses safe text DOM and a copy control rather than raw HTML insertion',()=>{
 assert.match(work,/document\.createTextNode/);
 assert.match(work,/element\.textContent=code\.join/);
 assert.match(work,/node\.replaceChildren/);
 assert.match(work,/navigator\.clipboard/);
 assert.doesNotMatch(work,/eval\(/);
});
