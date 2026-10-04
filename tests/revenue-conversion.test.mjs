import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const business=readFileSync(new URL('../services/business.html',import.meta.url),'utf8');
const audit=readFileSync(new URL('../services/website-audit.html',import.meta.url),'utf8');
const receptionist=readFileSync(new URL('../services/ai-receptionist.html',import.meta.url),'utf8');
const sitemap=readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8');
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const checkout=readFileSync(new URL('../api/create-checkout.js',import.meta.url),'utf8');
const fulfillment=readFileSync(new URL('../lib/business-fulfillment.js',import.meta.url),'utf8');

test('homepage exposes truthful business conversion paths',()=>{
  assert.match(index,/href="\/business"/);
  assert.match(index,/href="\/website-audit"/);
  assert.match(index,/href="\/ai-receptionist"/);
  assert.match(index,/href="\/support"/);
});

test('website audit has live price and scoped limitations',()=>{
  assert.match(audit,/£99/);
  assert.match(audit,/data-service-checkout="website-audit"/);
  assert.match(audit,/https:\/\/buy\.stripe\.com\/aFafZh6Nk5fH7KvbUI0VO01/);
  assert.match(audit,/does not guarantee rankings or traffic|does not guarantee rankings|No\. Search performance/i);
  assert.match(audit,/one-time/i);
});

test('AI receptionist has live checkout and no invented-facts promise',()=>{
  assert.match(receptionist,/£150/);
  assert.match(receptionist,/£49\/month/);
  assert.match(receptionist,/data-service-checkout="ai-receptionist"/);
  assert.match(receptionist,/https:\/\/buy\.stripe\.com\/bJe4gz4FcbE52qb3oc0VO00/);
  assert.match(receptionist,/without making up business facts/i);
});

test('business routes are public and indexed',()=>{
  const routes=new Map(vercel.rewrites.map(x=>[x.source,x.destination]));
  assert.equal(routes.get('/business'),'/services/business');
  assert.equal(routes.get('/website-audit'),'/services/website-audit');
  assert.equal(routes.get('/ai-receptionist'),'/services/ai-receptionist');
  for(const route of ['/business','/website-audit','/ai-receptionist']) assert.ok(sitemap.includes('https://trystellarai.com'+route));
});


test('business-service pages prefer server-created Stripe checkout with Stellar return URLs',()=>{
  assert.match(checkout,/plan === 'website-audit'/);
  assert.match(checkout,/service: 'website_mini_audit'/);
  assert.match(checkout,/website-audit-thank-you\.html\?session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(checkout,/plan === 'ai-receptionist'/);
  assert.match(checkout,/service: 'ai_receptionist'/);
  assert.match(checkout,/price_1UDYQ0F96AiVlq46EFGlhAYv/);
  assert.match(checkout,/price_1UDYQ6F96AiVlq46IwLxBzvQ/);
  assert.match(checkout,/ai-receptionist-thank-you\.html\?session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(fulfillment,/customer_details\?\.business_name \|\| session\?\.customer_details\?\.name/);
});


test('business-service checkout has a no-JS first-party redirect path',()=>{
  assert.match(checkout,/req\.method === 'GET' \? \(req\.query \|\| \{\}\) : \(req\.body \|\| \{\}\)/);
  assert.match(checkout,/GET checkout is only available for public business services/);
  assert.match(checkout,/res\.redirect\(303, checkout\.url\)/);
  assert.match(audit,/href="\/api\/create-checkout\?plan=website-audit&source=direct"/);
  assert.match(receptionist,/href="\/api\/create-checkout\?plan=ai-receptionist&source=direct"/);
  assert.match(audit,/data-fallback="https:\/\/buy\.stripe\.com\/aFafZh6Nk5fH7KvbUI0VO01"/);
  assert.match(receptionist,/data-fallback="https:\/\/buy\.stripe\.com\/bJe4gz4FcbE52qb3oc0VO00"/);
});
