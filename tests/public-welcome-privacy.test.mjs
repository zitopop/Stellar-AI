import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');

test('public chat welcome never falls back to the owner name',()=>{
  assert.doesNotMatch(app,/return 'Tobi'/);
  assert.match(app,/function welcomeName\(\)\{const raw=String\(signedInUser\?\.name\|\|''\)\.trim\(\);return raw\?raw\.split/);
});

test('empty chat home keeps a simple product-focused prompt',()=>{
  assert.match(app,/function welcomeSubtext\(\)\{return 'Build, debug, or ask anything\.'\}/);
  assert.match(app,/greeting\+\(name\?', '\+name:''\)/);
});
