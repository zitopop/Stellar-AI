import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
function node(){return {handlers:{},attrs:{},dataset:{},classList:{isOpen:false,remove(){this.isOpen=false;},toggle(k,v){this.isOpen=v;}},addEventListener(k,f){this.handlers[k]=f;},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},contains(){return false;}};}
function setup(){
 const menu=node(),nav=node(),document=node();menu.attrs['aria-expanded']='false';
 const buttons=['monthly','annual'].map(c=>Object.assign(node(),{dataset:{cycle:c}}));
 const cards=['starter','plus','pro'].map(plan=>{const nodes={'[data-price]':{},'[data-note]':{},'[data-choose]':{}};return {dataset:{plan},querySelector:s=>nodes[s]};});
 document.querySelector=()=>menu;document.getElementById=()=>nav;document.querySelectorAll=s=>s==='[data-cycle]'?buttons:cards;
 vm.runInNewContext(script,{document,window:{matchMedia:()=>({addEventListener(){}})}});
 return {menu,nav,document,buttons,cards};
}
test('homepage menu exposes its close action and supports Escape and link dismissal',()=>{
 const {menu,nav,document}=setup();menu.handlers.click();
 assert.equal(nav.classList.isOpen,true);assert.match(menu.innerHTML,/Close/);assert.equal(menu.attrs['aria-expanded'],'true');
 document.handlers.keydown({key:'Escape'});assert.equal(nav.classList.isOpen,false);assert.match(menu.innerHTML,/Menu/);
 menu.handlers.click();nav.handlers.click({target:{closest(){return true;}}});assert.equal(nav.classList.isOpen,false);
});
test('billing switch changes displayed amounts and the matching checkout plan',()=>{
 const {buttons,cards}=setup();buttons[1].handlers.click();
 const prices=['£67','£168','£630'];const names=['starter','plus','pro'];
 cards.forEach((card,i)=>{assert.equal(card.querySelector('[data-price]').innerHTML,prices[i]+'<small>/yr</small>');assert.match(card.querySelector('[data-choose]').href,new RegExp(names[i]+'-annual'));});
 buttons[0].handlers.click();assert.equal(cards[1].querySelector('[data-price]').innerHTML,'£20<small>/mo</small>');assert.doesNotMatch(cards[1].querySelector('[data-choose]').href,/plus-annual/);
});
