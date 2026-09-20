import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const business=readFileSync(new URL('../services/business.html',import.meta.url),'utf8');
const audit=readFileSync(new URL('../services/website-audit.html',import.meta.url),'utf8');
const receptionist=readFileSync(new URL('../services/ai-receptionist.html',import.meta.url),'utf8');
const sitemap=readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

test('homepage exposes truthful business conversion paths',()=>{
  assert.match(index,/href="\/business"/);
  assert.match(index,/href="\/website-audit"/);
  assert.match(index,/href="\/ai-receptionist"/);
  assert.match(index,/£99 ONE-TIME/);
  assert.match(index,/£150 \+ £49\/MO/);
});

test('website audit has live price and scoped limitations',()=>{
  assert.match(audit,/£99/);
  assert.match(audit,/https:\/\/buy\.stripe\.com\/aFafZh6Nk5fH7KvbUI0VO01/);
  assert.match(audit,/does not guarantee rankings or traffic|does not guarantee rankings|No\. Search performance/i);
  assert.match(audit,/one-time/i);
});

test('AI receptionist has live checkout and no invented-facts promise',()=>{
  assert.match(receptionist,/£150/);
  assert.match(receptionist,/£49\/month/);
  assert.match(receptionist,/https:\/\/buy\.stripe\.com\/bJe4gz4FcbE52qb3oc0VO00/);
  assert.match(receptionist,/without making up business facts/i);
});

test('business routes are public and indexed',()=>{
  const routes=new Map(vercel.rewrites.map(x=>[x.source,x.destination]));
  assert.equal(routes.get('/business'),'/services/business.html');
  assert.equal(routes.get('/website-audit'),'/services/website-audit.html');
  assert.equal(routes.get('/ai-receptionist'),'/services/ai-receptionist.html');
  for(const route of ['/business','/website-audit','/ai-receptionist']) assert.ok(sitemap.includes('https://trystellarai.com'+route));
});
