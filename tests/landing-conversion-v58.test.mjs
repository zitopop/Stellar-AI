import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellar-landing-conversion-v58.css',import.meta.url),'utf8');

test('homepage leads with the FiveM and Roblox product instead of mixed business hero copy',()=>{
  assert.match(home,/Build and fix FiveM &amp; Roblox scripts with AI\./);
  assert.match(home,/Generate QBCore, ESX, ox_lib and Roblox Luau code/);
  assert.doesNotMatch(home,/AI that builds, fixes<br><span>and automates\.<\/span>/);
  assert.match(home,/Need it fixed for you\? £99/);
});

test('homepage explains preview and free-account allowances consistently',()=>{
  assert.match(home,/3 instant previews before signup/);
  assert.match(home,/up to 15 Stellar Fast generations\/day/);
  assert.match(home,/No card for Free/);
});

test('homepage has a scoped one-off Priority Script Fix conversion path',()=>{
  assert.match(home,/id="priority-fix"/);
  assert.match(home,/Scope is confirmed before payment/);
  assert.match(home,/£99 one-off/);
  assert.match(home,/href="\/script-fix"/);
});

test('final conversion stylesheet trims duplicate long-form sections from the main funnel',()=>{
  assert.match(home,/stellar-landing-conversion-v58\.css\?v=20261005-1/);
  assert.match(css,/\.public-home \.stellar-business-entry/);
  assert.match(css,/\.public-home \.stellar-trust-section/);
  assert.match(css,/\.public-home \.stellar-debug-proof/);
  assert.match(css,/grid-template-columns:minmax\(0,1\.05fr\) minmax\(420px,\.95fr\)!important/);
});

test('buyer FAQs focus on trial, frameworks, debugging and cancellation',()=>{
  assert.ok(home.includes('Can I try Stellar before paying?'));
  assert.ok(home.includes('Which game frameworks does Stellar support?'));
  assert.ok(home.includes('Can Stellar help with broken scripts?'));
  assert.ok(home.includes('Can I cancel a paid plan?'));
});
