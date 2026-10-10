import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../lib/assets/stellarx-conversation.js',import.meta.url),'utf8');
const begin=source.indexOf('function greeting(value){');
const end=source.indexOf('function setMode(next){',begin);
assert.ok(begin>=0&&end>begin,'Desktop intent helper source should exist');
const {desktopRequest}=runInNewContext(source.slice(begin,end)+';({desktopRequest})',{}, {timeout:1000});
const requests=[
 ['I want to get going on my PC','connect'],
 ['Can you use my PC now?','connect'],
 ['Go on my PC and fix Stellar AI','task'],
 ['Check my project files','task'],
 ['Please check my laptop for errors','task'],
 ['Hi StellarX','chat'],
 ['How do I fix my PC?','chat'],
 ['Can I improve my website?','chat'],
];
for(const [input,expected] of requests){
 test('StellarX intent: '+input,()=>assert.equal(desktopRequest(input),expected));
}
