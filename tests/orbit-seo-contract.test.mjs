import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('app loads Stellar Orbit without replacing app logic',()=>{
  const app=read('app.html');
  assert.match(app,/stellar-orbit\.css\?v=2/);
  assert.match(app,/stellar-orbit-extras\.css\?v=2/);
  assert.match(app,/stellar-orbit\.js\?v=2/);
  assert.match(read('stellar-orbit.js'),/Spark/);
  assert.match(read('stellar-orbit.js'),/Star/);
  assert.match(read('stellar-orbit.js'),/Comet/);
  assert.match(read('stellar-orbit.js'),/Nova/);
});

test('blog hub is statically crawlable and uses clean canonical links',()=>{
  const blog=read('blog.html');
  const staticCards=(blog.match(/class="guide" href="\/blog\//g)||[]).length;
  assert.equal(staticCards,66);
  assert.doesNotMatch(blog,/href="\/blog\/blog-/);
  assert.match(blog,/data-guide-itemlist/);
  assert.match(blog,/66 guides available/);
});

test('all sitemap blog URLs resolve to an on-disk canonical html file',()=>{
  const sitemap=read('sitemap.xml');
  const urls=[...sitemap.matchAll(/<loc>https:\/\/trystellarai\.com(\/blog\/[^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.equal(urls.length,66);
  for(const u of urls){
    const p=path.join(root,`${u.slice(1)}.html`);
    assert.equal(fs.existsSync(p),true,`Missing static file for ${u}`);
  }
});

test('models page is routed, indexed and sitemap-listed',()=>{
  const cfg=JSON.parse(read('vercel.json'));
  assert.ok(cfg.rewrites.some(r=>r.source==='/models'&&r.destination==='/models.html'));
  assert.match(read('sitemap.xml'),/<loc>https:\/\/trystellarai\.com\/models<\/loc>/);
  assert.match(read('models.html'),/<link rel="canonical" href="https:\/\/trystellarai\.com\/models">/);
});

test('robots allows public pages but blocks API crawl',()=>{
  const robots=read('robots.txt');
  assert.match(robots,/User-agent: \*/);
  assert.match(robots,/Disallow: \/api\//);
  assert.match(robots,/Sitemap: https:\/\/trystellarai\.com\/sitemap\.xml/);
});
