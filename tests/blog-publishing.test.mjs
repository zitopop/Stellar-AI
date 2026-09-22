import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const xml=readFileSync(new URL('sitemap.xml',root),'utf8');
const urls=[...xml.matchAll(/<loc>(https:\/\/trystellarai\.com\/blog\/[^<]+)<\/loc>/g)].map(m=>new URL(m[1]));
const config=JSON.parse(readFileSync(new URL('vercel.json',root),'utf8'));
const resolveArticleFile=(url)=>{
  const route=config.rewrites.find(r=>r.source===url.pathname);
  const destination=route?.destination || `${url.pathname}/index.html`;
  assert.match(destination,/^\/blog\/(?:[^/]+\.html|[^/]+\/index\.html)$/,url.href);
  const file=new URL(destination.slice(1),root);
  assert.ok(existsSync(file), `missing rewrite or directory index for ${url.href}`);
  return {route,destination,file};
};
test('every sitemap article resolves to a real complete HTML document with searchable content',()=>{
  assert.ok(urls.length >= 63);
  for(const url of urls){
    const {file}=resolveArticleFile(url);
    assert.equal(lstatSync(file).isSymbolicLink(),false,url.href);
    const page=readFileSync(file,'utf8');
    assert.match(page,/^<!doctype html>/i,url.href);
    assert.equal((page.match(/<html\b/g)||[]).length,1,url.href);
    assert.equal((page.match(/<body\b/g)||[]).length,1,url.href);
    assert.equal((page.match(/<h1\b/g)||[]).length,1,url.href);
    assert.ok(page.includes(`<link rel="canonical" href="${url.href}">`),url.href);
    assert.match(page,/<meta name="description" content="[^"]{40,}"/);
    assert.match(page,/body\{[^}]*background:[^;}]+(?:;[^}]*)?color:[^;}]+/);
    assert.match(page,/<a[^>]+href="(?:https:\/\/trystellarai\.com)?\/app(?:\?welcome=1)?"[^>]*>/);
    const bodyMatch = page.match(/<div class="article-content">([\s\S]*?)<\/div>\s*<section class="related"/) || page.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    assert.ok(bodyMatch, `missing article body for ${url.href}`);
    assert.ok(bodyMatch[1].replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>=800,url.href);
    const schema=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.url || schema.mainEntityOfPage,url.href);
    if (schema.wordCount != null) assert.ok(schema.wordCount>=800);
  }
});
test('no wildcard blog rewrite intercepts valid sitemap articles',()=>{
  assert.ok(!config.rewrites.some(r=>r.source.startsWith('/blog/')&&r.source.includes(':')));
  for(const url of urls)assert.ok(!config.redirects.some(r=>r.source===url.pathname),'canonical must not redirect: '+url.pathname);
});
test('Roblox-only guides exclude FiveM installation commands',()=>{
  for(const url of urls.filter(u=>u.pathname.startsWith('/blog/roblox-'))){
    const {file}=resolveArticleFile(url);
    const page=readFileSync(file,'utf8');
    assert.doesNotMatch(page,/fxmanifest\.lua|ensure qb-core|RegisterNetEvent|server\.cfg/);
  }
});
