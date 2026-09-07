import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, v) => fs.writeFileSync(path.join(root, p), v);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function patchApp(){
  let html = read('app.html');
  if(!html.includes('/stellar-orbit.css')){
    html = html.replace('</head>', '  <link rel="stylesheet" href="/stellar-orbit.css?v=2">\n  <link rel="stylesheet" href="/stellar-orbit-extras.css?v=2">\n</head>');
  }
  if(!html.includes('/stellar-orbit.js')){
    html = html.replace('</body>', '  <script src="/stellar-orbit.js?v=2" defer></script>\n</body>');
  }
  write('app.html', html);
}

function canonicalFor(href){
  if(!href.startsWith('/blog/')) return href;
  if(!href.endsWith('.html')) return href;
  const local = path.join(root, href.slice(1));
  if(fs.existsSync(local)){
    const source = fs.readFileSync(local,'utf8');
    const m = source.match(/<link\s+rel=["']canonical["']\s+href=["']https:\/\/trystellarai\.com(\/blog\/[^"']+)["']/i)
      || source.match(/<link\s+href=["']https:\/\/trystellarai\.com(\/blog\/[^"']+)["']\s+rel=["']canonical["']/i);
    if(m) return m[1];
  }
  return href.replace(/\.html$/,'');
}

function patchBlog(){
  let html = read('blog.html');
  const arrayMatch = html.match(/const guides=(\[[\s\S]*?\]);/);
  if(!arrayMatch) throw new Error('Could not find guide data in blog.html');
  const guides = Function(`"use strict"; return (${arrayMatch[1]});`)();
  const clean = guides.map(([title,desc,tags,href]) => [title,desc,tags,canonicalFor(href)]);
  const cards = clean.map(([title,desc,tags,href]) => {
    const tag = tags.includes('roblox') ? 'Roblox' : tags.includes('qbcore') ? 'QBCore' : tags.includes('fivem') ? 'FiveM' : tags.includes('ai') ? 'AI' : 'Guide';
    return `<a class="guide" href="${esc(href)}" data-title="${esc(title.toLowerCase())}" data-desc="${esc(desc.toLowerCase())}" data-tags="${esc(tags)}"><span class="tag">${tag}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p><span class="guide-foot"><span>${tag}</span><b>Open guide →</b></span></a>`;
  }).join('');
  html = html.replace(/<strong id="total-count">\d+<\/strong>/, `<strong id="total-count">${clean.length}</strong>`);
  html = html.replace('Search all Roblox, FiveM, QBCore, ESX, security and development articles without hunting through separate pages. Older guides use their direct static file links so they remain accessible even while the clean URL routing is being repaired.', 'Search every Roblox, FiveM, QBCore, ESX, security and AI development guide from one crawlable library. Use search and filters to get to the right build faster.');
  html = html.replace(/<div id="guide-grid" class="grid"><\/div>/, `<div id="guide-grid" class="grid">${cards}</div>`);
  html = html.replace(/href="\/blog\/roblox-ai-game-builder\.html"/g,'href="/blog/roblox-ai-game-builder"')
             .replace(/href="\/blog\/fivem-ai-script-generator\.html"/g,'href="/blog/fivem-ai-script-generator"')
             .replace(/href="\/blog\/qbcore-ai-script-generator\.html"/g,'href="/blog/qbcore-ai-script-generator"');
  const filterScript = `<script>\n(()=>{const cards=[...document.querySelectorAll('#guide-grid .guide')],search=document.getElementById('search'),buttons=[...document.querySelectorAll('.filter')],result=document.getElementById('result-text'),empty=document.getElementById('empty');let filter='all';function apply(){const q=(search.value||'').trim().toLowerCase();let visible=0;for(const card of cards){const matchesFilter=filter==='all'||(card.dataset.tags||'').split(/\\s+/).includes(filter);const hay=(card.dataset.title+' '+card.dataset.desc+' '+card.dataset.tags);const show=matchesFilter&&(!q||hay.includes(q));card.hidden=!show;if(show)visible++;}result.textContent=visible+' of '+cards.length+' guides';empty.style.display=visible?'none':'block';}buttons.forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter||'all';buttons.forEach(x=>x.classList.toggle('active',x===b));apply();}));search.addEventListener('input',apply);apply();})();\n</script>`;
  html = html.replace(/<script>\s*const guides=\[[\s\S]*?<\/script>\s*<\/body>/, `${filterScript}\n</body>`);
  if(!html.includes('property="og:title"')){
    html = html.replace('<link rel="canonical" href="https://trystellarai.com/blog">', '<link rel="canonical" href="https://trystellarai.com/blog">\n<meta property="og:type" content="website"><meta property="og:title" content="All Roblox & FiveM Guides | Stellar AI"><meta property="og:description" content="Browse 66 Stellar AI Roblox, FiveM, QBCore, ESX, security and AI development guides."><meta property="og:url" content="https://trystellarai.com/blog"><meta property="og:image" content="https://trystellarai.com/og-image.png">');
  }
  const schema = { '@context':'https://schema.org','@type':'ItemList',name:'Stellar AI developer guides',numberOfItems:clean.length,itemListElement:clean.map(([title,, ,href],i)=>({'@type':'ListItem',position:i+1,name:title,url:`https://trystellarai.com${href}`})) };
  if(!html.includes('data-guide-itemlist')) html = html.replace('</head>', `<script type="application/ld+json" data-guide-itemlist>${JSON.stringify(schema)}</script>\n</head>`);
  write('blog.html', html);
}

function patchSitemap(){
  let xml = read('sitemap.xml');
  if(!xml.includes('https://trystellarai.com/models')){
    xml = xml.replace('</urlset>', '  <url><loc>https://trystellarai.com/models</loc><lastmod>2026-09-07</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n</urlset>');
  }
  xml = xml.replace(/<url><loc>https:\/\/trystellarai\.com\/app<\/loc><lastmod>[^<]+<\/lastmod>/, '<url><loc>https://trystellarai.com/app</loc><lastmod>2026-09-07</lastmod>')
           .replace(/<url><loc>https:\/\/trystellarai\.com\/<\/loc><lastmod>[^<]+<\/lastmod>/, '<url><loc>https://trystellarai.com/</loc><lastmod>2026-09-07</lastmod>');
  write('sitemap.xml', xml);
}

function patchRobots(){
  let txt = read('robots.txt');
  if(!/^Disallow: \/api\//m.test(txt)) txt = txt.replace('User-agent: *\nAllow: /', 'User-agent: *\nAllow: /\nDisallow: /api/');
  write('robots.txt', txt);
}

function patchVercel(){
  const file='vercel.json';
  const cfg=JSON.parse(read(file));
  cfg.rewrites ||= [];
  if(!cfg.rewrites.some(r=>r.source==='/models')){
    const blogIndex=cfg.rewrites.findIndex(r=>r.source==='/blog');
    cfg.rewrites.splice(blogIndex>=0?blogIndex+1:0,0,{source:'/models',destination:'/models.html'});
  }
  write(file, JSON.stringify(cfg,null,2)+'\n');
}

function patchIndex(){
  let html=read('index.html');
  if(!html.includes('href="/models"')){
    html=html.replace('<a href="/blog">Guides</a>', '<a href="/models">Models</a><a href="/blog">Guides</a>');
  }
  write('index.html',html);
}

patchApp();
patchBlog();
patchSitemap();
patchRobots();
patchVercel();
patchIndex();
console.log('Stellar Orbit + SEO patch applied.');
