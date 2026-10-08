import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'lib/assets/stellar-landing-clean-v1.css'),'utf8');

test('landing has a short FiveM Roblox headline and clear work scope',()=>{
 const headline=html.match(/<h1 id="hero-title">([^<]+)<\/h1>/)?.[1]||'';
 assert.match(headline,/FiveM &amp; Roblox/);
 assert.ok(headline.split(/\s+/).length<=10,'Hero headline too long');
 const lead=html.match(/<p class="lead">([^<]+)<\/p>/)?.[1]||'';
 assert.ok(lead.split(/\s+/).length<=22,'Hero explanation too long');
 assert.match(lead,/writing and planning/);
});
test('important working preview and navigation remain',()=>{
 for(const id of ['anonymous-preview-form','anonymous-preview-prompt','anonymous-preview-submit','anonymous-preview-result','anonymous-preview-download']) assert.match(html,new RegExp('id="'+id+'"'));
 const navigation=html.split('<nav class="site-nav"')[1].split('</nav>')[0];
 assert.equal((navigation.match(/href="#/g)||[]).length,5,'Navigation should be compact');
 for(const dest of ['#try-preview','#features','#work-tasks','#plans','#faq'])assert.ok(navigation.includes('href="'+dest+'"'));
 assert.match(html,/class="menu-toggle"/);
});
test('features and work examples are concise',()=>{
 const cards=[...html.matchAll(/<article class="feature">[\s\S]*?<p>([^<]+)<\/p><\/article>/g)];
 assert.equal(cards.length,4);
 for(const card of cards)assert.ok(card[1].trim().split(/\s+/).length<=13,'Feature too long');
 const work=html.split('id="work-tasks"')[1].split('id="plans"')[0];
 assert.equal((work.match(/class="work-shortcut"/g)||[]).length,4);
 assert.match(work,/No emails are sent automatically/);
});
test('pricing and customer support remain clear',()=>{
 for(const tier of ['free','starter','plus','pro'])assert.match(html,new RegExp('data-plan="'+tier+'"'));
 assert.match(html,/data-cycle="annual"/);
 assert.match(html,/Yearly plans are billed upfront/);
 for(const route of ['/terms','/privacy','/refunds','/support','/business'])assert.ok(html.includes('href="'+route+'"'));
 assert.match(html,/deadlyfox10@gmail\.com/);
});
test('compact styling retains 390px friendly breakpoints',()=>{
 assert.match(css,/\.section\{padding:55px 0/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/\.menu-toggle\{display:inline-flex/);
});