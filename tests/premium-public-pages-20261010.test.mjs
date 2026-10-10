import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const pages=[
 'plans.html','plugins.html','models.html','support.html','install.html',
 'business.html','blog.html','terms.html','privacy.html','refunds.html',
 'legal.html','acceptable-use.html','cookies.html'
];
const shared='/lib/assets/stellar-premium-pages-20261010.css?v=1';

test('primary public pages include scoped premium styles exactly once',()=>{
 for(const name of pages){
  const html=read(name);
  assert.equal(html.split(shared).length-1,1,name);
  assert.ok(html.indexOf(shared)<html.indexOf('</head>'),name+' head');
  assert.match(html,/<body[^>]*class="[^"]*stellar-polished-page[^"]*"/,name);
  if(/<main\b/.test(html)){
   assert.match(html,/<main\b[^>]*id="main"/,name+' main');
   assert.match(html,/class="stellar-skip" href="#main"/,name+' skip navigation');
  }
 }
});

test('premium styles preserve mobile, accessibility and reduced-motion affordances',()=>{
 const css=read('lib/assets/stellar-premium-pages-20261010.css');
 for(const scope of ['plans-page','plugins-page','support-page','install-page','business-hub','public-blog','legal-premium'])
  assert.ok(css.includes('.'+scope),scope);
 assert.match(css,/:focus-visible/);
 assert.match(css,/max-width:640px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/stellar-skip:focus/);
 assert.doesNotMatch(css,/pointer-events:none!important/);
});

test('payment, plugin connections and model controls remain available',()=>{
 const plans=read('plans.html');
 const plugins=read('plugins.html');
 assert.match(plans,/Twice Plus's monthly Fast-equivalent allowance/);
 for(const label of ['£8','£20','£75'])assert.ok(plans.includes(label),label);
 for(const id of ['plugin-command-status','plugin-quick-actions','directory-count','search'])assert.ok(plugins.includes('id="'+id+'"'));
 assert.match(plugins,/Connect with Google/);
 const install=read('install.html');
 assert.match(install,/faster access to chat, writing, planning, coding and project work/);
});
