import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const xml=readFileSync(new URL('sitemap.xml',root),'utf8');
const urls=[...xml.matchAll(/<loc>(https:\/\/trystellarai\.com\/blog\/[^<]+)<\/loc>/g)].map(m=>new URL(m[1]));
const config=JSON.parse(readFileSync(new URL('vercel.json',root),'utf8'));
test('every sitemap article resolves to a real complete HTML document with searchable content',()=>{
  assert.ok(urls.length >= 63);
  for(const url of urls){
    const route=config.rewrites.find(r=>r.source===url.pathname);
    assert.ok(route, `missing rewrite for ${url.href}`);
    assert.match(route.destination,/^\/blog\/[^/]+\.html$/,url.href);
    const file=new URL(route.destination.slice(1),root);
    assert.equal(lstatSync(file).isSymbolicLink(),false,url.href);
    const page=readFileSync(file,'utf8');
    assert.match(page,/^<!doctype html>/i,url.href);
    assert.equal((page.match(/<html\b/g)||[]).length,1,url.href);
    assert.equal((page.match(/<body\b/g)||[]).length,1,url.href);
    assert.equal((page.match(/<h1\b/g)||[]).length,1,url.href);
    assert.ok(page.includes(`<link rel="canonical" href="${url.href}">`),url.href);
    assert.match(page,/<meta name="description" content="[^"]{40,}"/);
    assert.match(page,/body\{[^}]*background:[^;}]+(?:;[^}]*)?color:[^;}]+/);
    assert.match(page,/<a[^>]+href="https:\/\/trystellarai\.com\/app(?:\?welcome=1)?"[^>]*>/);
    const bodyMatch = page.match(/<div class="article-content">([\s\S]*?)<\/div>\s*<section class="related"/) || page.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    assert.ok(bodyMatch, `missing article body for ${url.href}`);
    assert.ok(bodyMatch[1].replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>=800,url.href);
    const schema=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.url,url.href);assert.ok(schema.wordCount>=800);
  }
});
test('no wildcard blog rewrite intercepts valid sitemap articles',()=>{
  assert.ok(!config.rewrites.some(r=>r.source.startsWith('/blog/')&&r.source.includes(':')));
  for(const url of urls)assert.ok(!config.redirects.some(r=>r.source===url.pathname),'canonical must not redirect: '+url.pathname);
});
test('Roblox-only guides exclude FiveM installation commands',()=>{
  for(const url of urls.filter(u=>u.pathname.startsWith('/blog/roblox-'))){
    const route=config.rewrites.find(r=>r.source===url.pathname);
    const page=readFileSync(new URL(route.destination.slice(1),root),'utf8');
    assert.doesNotMatch(page,/fxmanifest\.lua|ensure qb-core|RegisterNetEvent|server\.cfg/);
  }
});
