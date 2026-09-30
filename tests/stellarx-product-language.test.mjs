import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('StellarX customer surfaces use one Work Agent identity',()=>{
  const desktop=read('desktop-agent.html');
  const app=read('app.html');
  const plugins=read('lib/plugin-registry.js');
  assert.match(desktop,/StellarX Work Agent/);
  assert.match(app,/Open StellarX Work Agent/);
  assert.match(plugins,/name:'StellarX Work Agent'/);
  assert.doesNotMatch(desktop,/Codex-style|<title>StellarX PC Agent/);
});

test('StellarX public copy avoids stale PC Agent labels',()=>{
  for(const path of ['deploy-center.html','jarvis-owner.html','work/index.html','privacy.html']){
    const source=read(path);
    assert.doesNotMatch(source,/>\s*PC Agent\s*</,path);
  }
});

test('StellarX keeps the controlled four-stage task flow',()=>{
  const desktop=read('desktop-agent.html');
  for(const text of ['1 · Task','2 · Inspect','3 · Approve','4 · Verify','Emergency Stop','Run approved actions']){
    assert.ok(desktop.includes(text),text);
  }
});
