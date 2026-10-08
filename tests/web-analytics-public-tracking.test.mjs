import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const loader=fs.readFileSync(path.join(root,'lib/assets/stellar-web-analytics.js'),'utf8');
const tag='<script defer src="/lib/assets/stellar-web-analytics.js?v=20261008-traffic-v1"></script>';

test('official Vercel loader is valid and uses first-party route',()=>{
 assert.doesNotThrow(()=>new vm.Script(loader));
 assert.match(loader,/\/_vercel\/insights\/script\.js/);
 assert.doesNotMatch(loader,/google-analytics\.com|googletagmanager\.com|facebook\.com\/tr/);
});

test('tracker is attached exactly once to 226 public HTML pages',()=>{
 const excluded=new Set(['offline.html','private-workspace.html','deploy-center.html','404.html']);
 let count=0;
 function check(file){const html=fs.readFileSync(file,'utf8');assert.equal(html.split(tag).length-1,1,path.relative(root,file));assert.ok(html.indexOf(tag)<html.indexOf('</head>'));count++;}
 for(const e of fs.readdirSync(root,{withFileTypes:true}))if(e.isFile()&&e.name.endsWith('.html')&&!excluded.has(e.name))check(path.join(root,e.name));
 function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&e.name.endsWith('.html'))check(p);}}
 for(const name of ['blog','services','free-tools','roblox-script-generator'])walk(path.join(root,name));
 assert.equal(count,226);
 for(const x of excluded)assert.doesNotMatch(fs.readFileSync(path.join(root,x),'utf8'),/stellar-web-analytics\.js/);
});

function simulate({hostname='trystellarai.com',optout='',gpc=false,storageThrows=false,already=false}={}){
 const scripts=[];const doc={
  querySelector:()=>already?{src:'/_vercel/insights/script.js'}:null,
  createElement:name=>({tagName:name,dataset:{}}),
  head:{appendChild:s=>scripts.push(s)}
 };
 const storage={getItem:()=>{if(storageThrows)throw Error('blocked storage');return optout;}};
 const ctx={location:{hostname},navigator:{globalPrivacyControl:gpc},localStorage:storage,document:doc,window:{}};
 vm.runInNewContext(loader,ctx,{timeout:500});
 return {scripts,window:ctx.window};
}
test('respect optout, GPC, untrusted hosts and storage denial',()=>{
 assert.equal(simulate({optout:'1'}).scripts.length,0);
 assert.equal(simulate({gpc:true}).scripts.length,0);
 assert.equal(simulate({storageThrows:true}).scripts.length,0);
 assert.equal(simulate({hostname:'example.com'}).scripts.length,0);
 assert.equal(simulate({already:true}).scripts.length,0);
});
test('allowed visitor loads Vercel script once without storing sensitive data',()=>{
 const r=simulate();
 assert.equal(r.scripts.length,1);
 assert.equal(r.scripts[0].src,'/_vercel/insights/script.js');
 assert.equal(r.scripts[0].dataset.stellarVercelAnalytics,'true');
 assert.equal(typeof r.window.va,'function');
});