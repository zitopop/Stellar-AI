import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const status=fs.readFileSync(new URL('../status.html',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('status page performs live reachability checks without inventing an uptime SLA',()=>{
  assert.match(status,/Stellar AI service status/);
  assert.match(status,/api\/get-plan\?stats=public/);
  assert.match(status,/does not claim a historical uptime SLA/);
  assert.doesNotMatch(status,/99\.8%|99\.9%|100% uptime/);
});

test('/status is a static rewrite and does not add a Vercel function',()=>{
  assert.deepEqual(vercel.rewrites.find(item=>item.source==='/status'),{source:'/status',destination:'/status.html'});
});
