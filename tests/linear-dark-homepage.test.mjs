import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('homepage uses the dark slate glass theme with purple and cyan glow accents',()=>{
  assert.match(home,/--stellar-bg:#090a0f/);
  assert.match(home,/--stellar-purple:#8a2be2/);
  assert.match(home,/--stellar-cyan:#00f0ff/);
  assert.match(home,/border:1px solid rgba\(255,255,255,.08\)/);
  assert.match(home,/backdrop-filter:blur\(22px\)/);
  assert.match(home,/dev-release-badge/);
  assert.match(home,/background:linear-gradient\(180deg,rgba\(9,10,15,.94\),rgba\(9,10,15,.8\)\)/);
});

test('hero is split between conversion copy and an interactive framework code editor',()=>{
  assert.match(home,/grid-template-columns:minmax\(0,.92fr\) minmax\(520px,1.08fr\)/);
  assert.match(home,/data-hero-editor/);
  for(const key of ['qbcore','esx','oxlib','luau']){
    assert.match(home,new RegExp(`data-hero-framework="${key}"`));
    assert.match(home,new RegExp(`data-hero-code="${key}"`));
  }
  assert.match(home,/hero-window-dots/);
  assert.match(home,/data-hero-copy>📋 Copy Code/);
  assert.match(home,/data-hero-download>💾 Download \.lua/);
  assert.match(home,/data-hero-framework="luau">Roblox Luau/);
  assert.match(home,/stellar-token-pulse/);
});

test('homepage code blocks use JetBrains Mono or Fira Code',()=>{
  assert.match(home,/family=JetBrains\+Mono/);
  assert.match(home,/\.public-home pre,\.public-home code\{font-family:"JetBrains Mono","Fira Code",monospace!important\}/);
});

test('hero editor copy and download controls are wired',()=>{
  assert.match(home,/querySelector\('\[data-hero-copy\]'\)/);
  assert.match(home,/navigator\.clipboard\.writeText/);
  assert.match(home,/querySelector\('\[data-hero-download\]'\)/);
  assert.match(home,/link\.download=mode==='luau'\?'stellar-modulescript\.lua':'stellar-'\+mode\+'\.lua'/);
});

test('Plus pricing card keeps the most-popular pill and receives a glowing featured border',()=>{
  assert.match(home,/class="plan featured" data-plan="plus"/);
  assert.match(home,/class="plan-badge">MOST POPULAR/);
  assert.match(home,/\.public-home \.plan\.featured\{[^}]*border-color:rgba\(138,43,226,.46\)/);
  assert.match(home,/\.public-home \.plan\.featured::before/);
  assert.match(home,/£20/);
});


test('premium landing polish uses a restrained visual system',()=>{
  assert.match(home,/id="stellar-landing-v46"/);
  assert.match(home,/background:#f1f2f4!important;color:#0b0c10!important/);
  assert.match(home,/.public-home .hero-editor{[sS]*?border-radius:18px!important/);
  assert.match(home,/.public-home .plan{[sS]*?background:#0f1218!important/);
  assert.match(home,/.public-home .plan.featured::before{display:none!important}/);
  assert.match(home,/animation:none!important/);
});
