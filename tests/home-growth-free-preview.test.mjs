import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const read=p=>readFileSync(join(root,p),'utf8');
const home=read('index.html'),css=read('lib/assets/stellar-landing-clean-v1.css'),js=read('lib/assets/homepage.js');
test('preview submit has meaningful visible label and fixed height',()=>{
 assert.match(home,/id="anonymous-preview-submit"[^>]*>Generate preview<\/button>/);
 assert.equal((js.match(/submit\.textContent = 'Generate preview'/g)||[]).length,2);
 assert.match(js,/submit\.textContent = 'Generating…'/);
 assert.match(css,/\.preview-form\{display:flex;gap:10px;align-items:flex-end\}/);
 assert.match(css,/\.preview-form button\{min-width:150px;min-height:48px;height:48px;align-self:flex-end/);
 assert.match(css,/\.preview-form button\{width:100%;min-height:48px;height:48px;align-self:stretch\}/);
 assert.match(home,/stellar-landing-clean-v1\.css\?v=20261008-layout-v4/);
 assert.match(home,/homepage\.js\?v=20261008-preview-v4/);
});
test('hero and vertical spacing are reduced but feature and plans intact',()=>{
 assert.match(css,/h1\{font-size:clamp\(42px,4\.65vw,64px\)/);
 assert.match(css,/\.section\{padding-block:36px\}/);
 for(const id of ['anonymous-preview-form','anonymous-preview-result','anonymous-preview-download','hero-title']) assert.match(home,new RegExp('id="'+id+'"'));
 for(const tier of ['free','starter','plus','pro'])assert.match(home,new RegExp('data-plan="'+tier+'"'));
});
test('README and free code resource route visitors to the live demo with attribution',()=>{
 const readme=read('README.md'),resources=read('developer-resources/README.md'),blog=read('blog/debug-fivem-lua-errors-with-ai.html');
 assert.match(readme,/first 3 script previews/);
 assert.match(readme,/utm_source=github/);
 assert.match(resources,/developer_resources#try-preview/);
 assert.match(blog,/utm_source=blog/);
 assert.match(blog,/Try 3 free script previews/);
 assert.match(read('docs/ORGANIC_PROMOTION_20261008.md'),/no account required/i);
});
