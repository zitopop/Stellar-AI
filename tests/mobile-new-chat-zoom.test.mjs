import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');

test('mobile new chat does not autofocus and trigger iPhone zoom',()=>{
  assert.match(app,/id="stellar-mobile-new-chat-zoom-v83"/);
  assert.match(app,/@media\(max-width:900px\)\{[\s\S]*?#prompt\{font-size:16px!important\}/);
  assert.match(app,/function resetNewChatView\(\)\{const mobile=matchMedia\('\(max-width:900px\)'\)\.matches;if\(!mobile\)\{prompt\.focus\(\);return\}/);
  assert.match(app,/document\.activeElement instanceof HTMLElement\)document\.activeElement\.blur\(\)/);
  assert.match(app,/chat\.scrollTop=0;window\.scrollTo\(\{top:0,left:0,behavior:'auto'\}\)/);
  assert.match(app,/setStatus\('Ready','good'\);resetNewChatView\(\)/);
});
