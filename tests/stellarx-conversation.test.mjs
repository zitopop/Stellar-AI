import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../desktop-agent.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../lib/assets/stellarx-conversation.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellarx-conversation.css',import.meta.url),'utf8');

test('StellarX opens as a real chat, not an inspection planner',()=>{
 assert.match(page,/stellarx-conversation\.js/);
 assert.match(page,/stellarx-conversation\.css/);
 assert.match(js,/setMode\(prompt\.value\.trim\(\)\?'computer':'chat'\)/);
 assert.match(js,/mode==='chat'\|\|greeting\(text\)/);
 assert.match(js,/fetch\('\/api\/chat'/);
 assert.match(js,/data-sx-mode="computer"/);
 assert.match(js,/role','log'/);
 assert.match(css,/#sxMessages/);
});
test('PC tasks only go through reviewed action flow and chat uses the ordinary usage enforcement',()=>{
 assert.match(js,/await originalComputerTask\?\.\(\)/);
 assert.match(js,/source:'stellarx-chat'/);
 assert.match(js,/model:'spark'/);
 assert.match(js,/AbortController/);
 assert.match(js,/\.textContent=text/);
 assert.doesNotMatch(js,/innerHTML\s*=\s*text/);
});
