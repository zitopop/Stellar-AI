import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const home=read('index.html');
const preview=read('lib/assets/homepage.js');
const demos=read('lib/assets/stellar-landing-demo-tabs-v1.js');

test('landing is focused, transparent and avoids invented endorsements',()=>{
 assert.match(home,/Your ideas\. Real work\. One powerful AI\./);
 assert.match(home,/writing|Write clearly/i);
 assert.match(home,/Code help/);
 assert.match(home,/No card required/);
 assert.match(home,/Generated work needs your review|Preview and test generated code before using it/i);
 assert.doesNotMatch(home,/guaranteed bug-free|trusted by \d+|most popular choice/i);
 assert.ok(home.length<80000);
});

test('live coding preview keeps controls and rate safeguards',()=>{
 for(const id of ['anonymous-preview-form','anonymous-preview-prompt','anonymous-preview-submit','anonymous-preview-status','anonymous-preview-result','anonymous-preview-code','anonymous-preview-download']){
  assert.match(home,new RegExp('id="'+id+'"'));
 }
 assert.match(home,/homepage\.js\?v=20261010-examples-v9/);
 assert.match(preview,/wireAnonymousPreview\(\)/);
 assert.match(preview,/fetch\('\/api\/preview'/);
 assert.match(preview,/ANON_PREVIEW_LIMIT/);
 assert.match(demos,/Illustrative|illustrative/);
 assert.match(home,/Illustrative examples · not a live chat/);
});

test('pricing and checkout links support all four plans',()=>{
 for(const plan of ['free','starter','plus','pro'])assert.match(home,new RegExp('data-plan="'+plan+'"'));
 for(const price of ['£8','£20','£75','£67','£168','£630'])assert.ok(home.includes(price),price);
 assert.match(home,/data-cycle="annual"/);
 for(const slug of ['starter-annual','plus-annual','pro-annual'])assert.match(home,new RegExp(slug));
 assert.match(home,/data-conversion="start-free"/);
 assert.match(home,/data-conversion="plus"/);
 assert.match(home,/telemetry\.js\?v=20261005-revenue-funnel/);
});

test('navigation and legal links remain available',()=>{
 assert.match(home,/class="menu-toggle"/);
 assert.match(home,/aria-expanded="false"/);
 for(const path of ['/plans','/terms','/privacy','/refunds','/support','/business','/install','/server-pass','/script-fix']){
  assert.match(home,new RegExp('href="'+path+'"'));
 }
});
