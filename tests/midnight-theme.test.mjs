import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellar-midnight-20261011.css',import.meta.url),'utf8');

test('Midnight stylesheet is loaded after other app styles and on the public homepage',()=>{
 const link='/lib/assets/stellar-midnight-20261011.css?v=1';
 assert.ok(app.includes(link));
 assert.ok(home.includes(link));
 assert.ok(app.indexOf(link)>app.indexOf('/lib/assets/stellar-focus-v1.css'));
 assert.match(css,/--bg:#090A0F/);
 assert.match(css,/--accent:#8B5CF6/);
 assert.match(css,/body\[data-stellar-clean-app="true"\] \.welcome h1/);
 assert.match(css,/\.public-home \.site-header/);
});

test('automatic greeting is capitalised and changes at local time boundaries',()=>{
 const source=app.match(/function welcomeGreeting\(nowDate=new Date\(\)\)\{[^\n]+\}/)?.[0];
 assert.ok(source,'greeting helper present');
 const greet=runInNewContext(source+';welcomeGreeting',{Date});
 const at=hour=>({getHours:()=>hour});
 for(const [hour,result] of [[0,'GOOD NIGHT'],[4,'GOOD NIGHT'],[5,'GOOD MORNING'],[11,'GOOD MORNING'],[12,'GOOD AFTERNOON'],[16,'GOOD AFTERNOON'],[17,'GOOD EVENING'],[21,'GOOD EVENING'],[22,'GOOD NIGHT']]){
   assert.equal(greet(at(hour)),result);
 }
 assert.match(app,/id="stellar-welcome-title"/);
 assert.match(app,/welcomeName\(\)\.toLocaleUpperCase\(\)/);
 assert.match(app,/setInterval\(refreshWelcomeGreeting,60\*1000\)/);
 assert.match(app,/visibilitychange/);
});
