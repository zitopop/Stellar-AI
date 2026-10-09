import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const specs=[
  {file:'blog/fivem-bank-heist-script.html',term:'FiveM Bank Heist Script',campaign:'bank_heist_guide',canonical:'https://trystellarai.com/blog/fivem-bank-heist-script'},
  {file:'blog/qbcore-drug-system.html',term:'QBCore Drug System Script',campaign:'qbcore_drug_guide',canonical:'https://trystellarai.com/blog/qbcore-drug-system'}
];
for(const spec of specs){
  test(spec.file+' search snippet and first-screen CTA',()=>{
    const html=fs.readFileSync(path.join(root,spec.file),'utf8');
    const title=html.match(/<title>(.*?)<\/title>/)?.[1]||'';
    const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
    assert.match(title,new RegExp(spec.term));
    assert.match(title,/2026/);
    assert.ok(title.length<=70,'title longer than 70 characters');
    assert.ok(description.length>=105&&description.length<=160,'description needs a concise, clear summary');
    assert.equal((html.match(/<meta name="description"/g)||[]).length,1);
    assert.match(html,/content="index,follow/);
    assert.ok(html.includes('rel="canonical" href="'+spec.canonical+'"'));
    const intro=html.match(/<p class="intro">([\s\S]*?)<\/p>/)?.[1]||'';
    assert.ok(intro.includes('3 free AI script previews'));
    assert.ok(intro.includes('utm_source=blog&utm_medium=organic&utm_campaign='+spec.campaign));
    assert.match(html,/stellar-web-analytics\.js/);
  });
}
