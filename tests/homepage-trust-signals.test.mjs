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
