import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const pricing=readFileSync(new URL('../lib/pricing.js',import.meta.url),'utf8');

test('game developer hero uses focused generation and debugging conversion copy',()=>{
  assert.match(home,/Build better game scripts\./);
  assert.match(home,/Fix broken ones faster\./);
  assert.match(home,/STELLAR AI FOR FIVEM \+ ROBLOX DEVELOPERS/);
  assert.match(home,/Generate, debug and export QBCore, ESX, ox_lib and Roblox Luau/);
  assert.match(home,/Start building free/);
  assert.match(home,/href="\/app\?mode=debug" class="oa2-secondary-action">Paste broken code/);
  for(const framework of ['QBCore','ESX','ox_lib','Roblox Luau','ModuleScripts']) assert.match(home,new RegExp(framework.replace('_','_')));
  assert.match(home,/Test changes on a development server or Studio place before production/);
});

test('homepage has tabbed script generator and error debugger with highlighted Lua and download demo',()=>{
  assert.match(home,/data-dev-tab="generator">Script Generator/);
  assert.match(home,/data-dev-tab="debugger">Error Debugger/);
  assert.match(home,/data-dev-panel="generator"/);
  assert.match(home,/data-dev-panel="debugger"/);
  assert.match(home,/class="syn-key"/);
  assert.match(home,/data-demo-download="generator">Download \.lua/);
  assert.match(home,/new Blob\(\[code\.trim\(\)\+'\\n'\]/);
});

test('homepage explains the developer advantage with concise proof cards',()=>{
  assert.match(home,/Built around the work you actually do\./);
  for(const proof of ['FRAMEWORK AWARE','DEBUG FIRST','EXPORT READY','Open the developer workspace']) assert.match(home,new RegExp(proof));
  assert.doesNotMatch(home,/Typical chat workflow|Generic AI vs Stellar AI/);
});

test('homepage pricing reflects live server plan ceilings rather than stale marketing numbers',()=>{
  assert.match(pricing,/starter:[\s\S]*?requestsPerHour: 120/);
  assert.match(pricing,/plus:[\s\S]*?requestsPerHour: 400/);
  assert.match(pricing,/pro:[\s\S]*?requestsPerHour: 1600/);
  assert.match(pricing,/free:[\s\S]*?includedCredits: 100/);
  assert.match(home,/£8 Starter · 120 req\/hr/);
  assert.match(home,/£20 Plus · 400 req\/hr/);
  assert.match(home,/£75 Pro · 1,600 req\/hr · Nova/);
  assert.match(home,/£1 free credit · no card required/);
  assert.match(home,/100 credits refresh each day/);
  assert.match(home,/120 requests\/hour ceiling[\s\S]*?longer scripts/);
  assert.match(home,/400 requests\/hour ceiling[\s\S]*?full game systems/);
  assert.match(home,/1,600 requests\/hour ceiling \+ Nova[\s\S]*?Nova model access/);
});

test('homepage uses evidence-based developer trust signals instead of unverifiable security hype',()=>{
  assert.match(home,/Server-side secret handling/);
  assert.match(home,/No card for Free/);
  assert.match(home,/https:\/\/discord\.gg\/e6uRAV9HGA/);
  assert.match(home,/https:\/\/github\.com\/zitopop\/Stellar-AI/);
  assert.doesNotMatch(home,/data-discord-members/);
  assert.doesNotMatch(home,/Service online/);
  assert.doesNotMatch(home,/256-bit API Encryption|Code Not Used For Training/);
});

test('390px mobile safeguards keep the CTA early and code scrolling inside the editor',()=>{
  assert.match(home,/@media\(max-width:390px\)[\s\S]*?\.public-home \.oa2-hero\{padding-top:42px!important;gap:30px!important\}/);
  assert.match(home,/@media\(max-width:390px\)[\s\S]*?\.public-home \.oa2-hero-actions\{margin-top:18px!important\}/);
  assert.match(home,/@media\(max-width:390px\)[\s\S]*?\.public-home \.hero-editor-code\{[^}]*overflow-x:auto!important;[^}]*white-space:pre!important/);
  assert.match(home,/html,body\.public-home\{max-width:100%!important;overflow-x:hidden!important\}/);
});

test('homepage debugger CTA opens app debugger mode',()=>{
  assert.match(app,/q\.get\('mode'\)/);
  assert.match(app,/setComposerMode\('debug',false\)/);
});


test('landing page removes hidden legacy product and business blocks from the DOM',()=>{
  assert.doesNotMatch(home,/id="product-map"/);
  assert.doesNotMatch(home,/class="stellar-revenue-path"/);
});
