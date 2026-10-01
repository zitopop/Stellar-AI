import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const home=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const plan=fs.readFileSync(new URL('../api/get-plan.js',import.meta.url),'utf8');
const terms=fs.readFileSync(new URL('../terms.html',import.meta.url),'utf8');
const support=fs.readFileSync(new URL('../support.html',import.meta.url),'utf8');
const privacy=fs.readFileSync(new URL('../privacy.html',import.meta.url),'utf8');

test('developer trust strip links to real first-party proof surfaces',()=>{
  assert.match(home,/Privacy policy/);
  assert.match(home,/Clear terms/);
  assert.match(home,/Public GitHub/);
  assert.match(home,/Official Stellar AI community/);
  assert.match(home,/AI-generated code still needs runtime testing and server-side validation/);
});

test('Discord social proof comes from the live invite API and has a non-numeric fallback',()=>{
  assert.match(plan,/discord\.com\/api\/v10\/invites\/e6uRAV9HGA\?with_counts=true/);
  assert.match(plan,/approximate_member_count/);
  assert.match(plan,/approximate_presence_count/);
  assert.match(home,/Join the developer Discord/);
  assert.doesNotMatch(home,/Join 1,000\+/);
});

test('public support identity is consistent',()=>{
  for(const source of [terms,support,privacy]) assert.match(source,/support@trystellarai\.com/);
  assert.doesNotMatch(terms,/deadlyfox10@gmail\.com/);
});


test('trust-first hero avoids invented benchmark and privacy claims',()=>{
  for(const claim of ['HTTPS encrypted in transit','Server-authoritative security guidance','100 free credits/day','Live service status']) assert.match(home,new RegExp(claim));
  assert.doesNotMatch(home,/99\.8%|<\s*3\.2s|1,000\+|256-Bit|Zero Code-Storage Training|Dedicated Instance/);
});

test('homepage links to a real static status surface',()=>{
  assert.match(home,/href="\/status"/);
});
