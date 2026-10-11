import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellar-midnight-20261011.css',import.meta.url),'utf8');

test('Midnight stylesheet is loaded after other app styles and on the public homepage',()=>{
 const link='/lib/assets/stellar-midnight-20261011.css?v=2';
 assert.ok(app.includes(link));
 assert.ok(home.includes(link));
 assert.ok(app.indexOf(link)>app.indexOf('/lib/assets/stellar-focus-v1.css'));
 assert.match(css,/--bg:#090A0F/);
 assert.match(css,/--accent:#B8BDC7/);
 assert.match(css,/body\[data-stellar-clean-app="true"\] \.welcome h1/);
 assert.match(css,/\.public-home \.site-header/);
 assert.match(css,/\.welcome::before/);
 assert.match(css,/content:none!important/);
 assert.match(css,/-webkit-text-fill-color:#F8F8FA!important/);
 assert.doesNotMatch(css,/#[a-f0-9]*8b5cf6|#a78bfa|#9f7aea|139,92,246|radial-gradient/i);
});

test('automatic greeting is capitalised and changes at local time boundaries',()=>{
 const source=app.match(/function welcomeGreeting\(nowDate=new Date\(\)\)\{[^\n]+\}/)?.[0];
 assert.ok(source,'greeting helper present');
 const greet=runInNewContext(source+';welcomeGreeting',{Date});
 const at=hour=>({getHours:()=>hour});
 for(const [hour,result] of [[0,'Good Night'],[4,'Good Night'],[5,'Good Morning'],[11,'Good Morning'],[12,'Good Afternoon'],[16,'Good Afternoon'],[17,'Good Evening'],[21,'Good Evening'],[22,'Good Night']]){
   assert.equal(greet(at(hour)),result);
 }
 assert.match(app,/id="stellar-welcome-title"/);
 assert.match(app,/\+\(name\?' '\+name:''\)/);
 assert.match(app,/function welcomeDisplayName\(\)/);
 assert.match(app,/setInterval\(refreshWelcomeGreeting,60\*1000\)/);
 assert.match(app,/visibilitychange/);
});
