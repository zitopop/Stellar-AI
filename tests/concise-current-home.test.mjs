import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('lib/assets/stellar-landing-clean-v1.css');
const focused=read('lib/assets/stellar-landing-focused-v2.css');

test('hero is concise and relevant to everyday AI work',()=>{
 const headline=html.match(/<h1 id="hero-title">([^<]+)<\/h1>/)?.[1]||'';
 assert.match(headline,/Your ideas\. Real work\. One powerful AI\./);
 assert.ok(headline.split(/\s+/).length<=10,'Hero headline should stay short');
 const lead=html.match(/<p class="lead">([^<]+)<\/p>/)?.[1]||'';
 assert.ok(lead.split(/\s+/).length<=35,'Hero explanation should stay concise');
 assert.match(lead,/writing, planning, understanding files and solving code problems/i);
});

test('mobile menu links to working landing sections',()=>{
 const nav=html.split('<nav class="site-nav"')[1]?.split('</nav>')[0]||'';
 const anchors=[...nav.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(anchors,['work-tasks','jarvis','plans','faq']);
 for(const id of anchors)assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/class="menu-toggle"/);
});

test('work examples remain useful without repeated features sections',()=>{
 assert.doesNotMatch(html,/id="features"/);
 const work=html.split('id="work-tasks"')[1]?.split('id="plans"')[0]||'';
 assert.equal((work.match(/class="work-shortcut"/g)||[]).length,4);
 for(const label of ['Write an email','Plan a project','Explain files and notes','Debug code'])assert.ok(work.includes(label),label);
 assert.match(html,/id="anonymous-preview-form"/);
});

test('pricing and customer support remain clear and accurate',()=>{
 for(const tier of ['free','starter','plus','pro']) assert.ok(html.includes('data-plan="'+tier+'"'),tier);
 assert.match(html,/data-cycle="annual"/);
 assert.match(html,/Yearly plans are billed upfront/);
 for(const route of ['/terms','/privacy','/refunds','/support','/business'])assert.ok(html.includes('href="'+route+'"'),route);
});

test('compact styling retains mobile and reduced-motion support',()=>{
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/\.menu-toggle\{display:inline-flex/);
 assert.match(focused,/@media\(max-width:640px\)/);
 assert.match(focused,/prefers-reduced-motion:reduce/);
});
