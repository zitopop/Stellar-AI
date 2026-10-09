import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
function element(classes=[]) {
  const values=new Set(classes);
  return {attrs:{}, classList:{add(...xs){xs.forEach(x=>values.add(x));},remove(...xs){xs.forEach(x=>values.delete(x));},contains(x){return values.has(x);}},setAttribute(k,v){this.attrs[k]=v;},focus(){this.focused=true;}};
}
function setup(mobile=false) {
 const panel=element(['settings-simple-panel','settings-profile-panel','model-picker-compact']);
 const backdrop=element(['open','auth-open']);
 class HTMLElement {}
 const origin=new HTMLElement();origin.focus=()=>origin.focused=true;
 const close=element();
 const context={panelBackdrop:backdrop,panelReturnFocus:null,HTMLElement,document:{activeElement:origin,getElementById:()=>panel,contains:()=>true},$:()=>close,matchMedia:()=>({matches:mobile}),metric(){},setTimeout:f=>f(),closeSide(){context.sideClosed=true;}};
 for(const name of ['Plans','Usage','Models','Search','Tools','RevenueCalculator','SalesMode','JarvisBriefings','MobileControl','Settings']) context['render'+name+'Panel']=()=>{};
 const closeSource=app.slice(app.indexOf('function showPanel(){'),app.indexOf('function trapPanelFocus('));
 const openSource=app.slice(app.indexOf('function openPanel(kind){'),app.indexOf("chatInner.addEventListener('click'",app.indexOf('function openPanel(kind){')));
 vm.createContext(context);vm.runInContext(closeSource+';'+openSource,context);
 return {context,panel,backdrop,origin,close};
}
test('opening another panel removes Settings and model presentation state',()=>{
 const {context,panel,backdrop,close}=setup(true);
 context.openPanel('plans');
 for(const c of ['settings-simple-panel','settings-profile-panel','model-picker-panel','model-picker-compact']) assert.equal(panel.classList.contains(c),false);
 assert.equal(backdrop.attrs['aria-hidden'],'false');
 assert.equal(backdrop.classList.contains('open'),true);
 assert.equal(context.sideClosed,true);
 assert.equal(close.focused,true);
});
test('panel dismissal hides overlay and restores the original control focus',()=>{
 const {context,backdrop,origin}=setup();context.openPanel('models');context.closePanel();
 assert.equal(backdrop.classList.contains('open'),false);
 assert.equal(backdrop.classList.contains('auth-open'),false);
 assert.equal(backdrop.attrs['aria-hidden'],'true');
 assert.equal(origin.focused,true);
 assert.equal(context.panelReturnFocus,null);
});
test('Settings backdrop and Escape dismissal have no Settings-specific veto',()=>{
 assert.match(app,/panelBackdrop\.addEventListener\('click',e=>\{if\(e\.target===panelBackdrop\)closePanel\(\)\}\)/);
 const keyHandler=app.slice(app.indexOf("document.addEventListener('keydown',e=>{if(e.key==='Escape')"));
 assert.match(keyHandler.split('composerModeButtons.forEach')[0],/closePanel\(\)/);
 assert.doesNotMatch(keyHandler.split('composerModeButtons.forEach')[0],/settings-profile-panel/);
 assert.match(app,/\$\('closePanel'\)\.addEventListener\('click',closePanel\)/);
});
