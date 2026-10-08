import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
const styles=fs.readFileSync(path.join(root,'lib/assets/stellar-work-home.css'),'utf8');

function section(id){
  const match=homepage.match(new RegExp('<section[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)(?=\\n\\s*<section|\\n\\s*</main>)'));
  assert.ok(match,'Missing section '+id);
  return match[1];
}
function textAfter(str,start,end){
  const from=str.indexOf(start);assert.ok(from>=0,'Missing '+start);
  const a=str.indexOf('>',from)+1;
  const b=str.indexOf(end,a);assert.ok(b>a,'Missing close '+end);
  return str.slice(a,b).replace(/<[^>]*>/g,'').trim();
}
test('concise, task-led hero and clear next action',()=>{
  const hero=homepage.match(/<h1 id="stellar-about-title">([^<]+)<\/h1>[\s\S]*?<p class="stellar-about-copy">([^<]+)<\/p>/);
  assert.ok(hero);
  assert.match(hero[1],/AI for work and game scripts/);
  assert.ok(hero[2].split(/\s+/).length<=20,'Hero text should be short');
  assert.match(homepage,/Start free<\/a>/);
  assert.match(homepage,/href="\/app\?mode=debug/);
  assert.match(homepage,/Free plan · no card/);
});
test('visible explanations are short and distinctive',()=>{
  const work=section('work-tasks');
  assert.match(work,/What do you need help with\?/);
  assert.equal((work.match(/class="stellar-work-shortcut" href=/g)||[]).length,4);
  const features=section('capabilities');
  assert.equal((features.match(/<article><strong>/g)||[]).length,6);
  for(const match of features.matchAll(/<article><strong>[^<]+<\/strong><p>([^<]+)<\/p><\/article>/g)){
    assert.ok(match[1].split(/\s+/).length<=15,'Feature description too long: '+match[1]);
  }
  assert.match(section('workspace'),/Access depends on your plan/);
  const compare=section('compare-ai');
  assert.match(compare,/<details class="stellar-compare-reveal">/);
  assert.doesNotMatch(compare,/<details class="stellar-compare-reveal" open/);
});
test('pricing remains accessible and differentiates tiers',()=>{
  const pricing=section('plans');
  assert.match(pricing,/data-home-billing="monthly"/);
  assert.match(pricing,/data-home-billing="annual"/);
  for(const key of ['free','starter','plus','pro']){
    assert.match(pricing,new RegExp('data-home-plan="'+key+'"'));
    const piece=pricing.split('data-home-plan="'+key+'"')[1].split('</article>')[0];
    assert.ok((piece.match(/<li>/g)||[]).length>=3);
    assert.ok((piece.match(/<li>/g)||[]).length<=4,'Plan is too verbose');
  }
  assert.match(pricing,/Usage and fair-use limits apply/);
  assert.match(pricing,/Yearly plans are billed upfront/);
  assert.match(pricing,/href="\/plans"/);
});
test('support, privacy, other businesses and responsive layout survive',()=>{
  for(const id of ['work-tasks','capabilities','workspace','compare-ai','plans','other-businesses','questions','policies'])assert.match(homepage,new RegExp('id="'+id+'"'));
  for(const link of ['/terms','/privacy','/refunds','/support','/business','/plans']) assert.ok(homepage.includes('href="'+link+'"'));
  assert.match(homepage,/mailto:deadlyfox10@gmail\.com/);
  assert.match(styles,/@media\(max-width:640px\)/);
  assert.match(styles,/stellar-compact-20261008/);
  const mobileMenu=fs.readFileSync(path.join(root,'lib/assets/homepage.js'),'utf8');
  assert.match(mobileMenu,/Account \/ Sign in/);
  assert.match(mobileMenu,/Create account/);
  assert.match(styles,/mobile navigation and introduction within the viewport/);
  assert.match(styles,/focus-visible/);
});