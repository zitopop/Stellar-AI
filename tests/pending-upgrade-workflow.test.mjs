import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const html=fs.readFileSync(path.resolve(import.meta.dirname,'../app.html'),'utf8');
const start=html.indexOf("function pendingUpgrade(v='')");
const end=html.indexOf('function acquisitionSource()',start);
assert.ok(start>=0 && end>start,'Upgrade intent handler exists');
const handler=html.slice(start,end);
function makeSession(initial='') {
 const data=new Map();
 if(initial)data.set('stellar-pending-upgrade',initial);
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
}
function run(search,storage,value) {
 const ctx={location:{search},sessionStorage:storage,URLSearchParams,UPGRADE_PLANS:new Set(['starter','starter-annual','plus','plus-annual','pro','pro-annual'])};
 return vm.runInNewContext(handler+'; pendingUpgrade('+ (value?JSON.stringify(value):'') +')',ctx);
}
test('explicit upgrade choice survives sign in and authentication return',()=>{
 const storage=makeSession();
 assert.equal(run('?upgrade=plus',storage),'plus');
 assert.equal(storage.getItem('stellar-pending-upgrade'),'plus');
 assert.equal(run('?signin=1',storage),'plus');
 assert.equal(run('',storage),'plus');
});
test('starting an unrelated writing task clears abandoned checkout intent',()=>{
 const storage=makeSession('plus');
 assert.equal(run('?prompt=Help%20me%20write%20a%20professional%20email',storage),'');
 assert.equal(storage.getItem('stellar-pending-upgrade'),null);
});
test('debug, starter, tool and welcome links do not reopen stale billing prompts',()=>{
 for(const query of ['?mode=debug','?starter=roblox','?tool=revenue','?welcome=1','?account=1','?jarvis=voice']){
  const storage=makeSession('pro');
  assert.equal(run(query,storage),'',query);
  assert.equal(storage.getItem('stellar-pending-upgrade'),null,query);
 }
});
test('explicit checkout wins even if a task prompt is included',()=>{
 const storage=makeSession('starter');
 assert.equal(run('?upgrade=pro-annual&prompt=Build%20a%20script',storage),'pro-annual');
 assert.equal(storage.getItem('stellar-pending-upgrade'),'pro-annual');
});
test('a user choosing an upgrade in the app still gets it remembered',()=>{
 const storage=makeSession();
 assert.equal(run('?prompt=Write%20a%20note',storage,'starter'),'starter');
 assert.equal(storage.getItem('stellar-pending-upgrade'),'starter');
});