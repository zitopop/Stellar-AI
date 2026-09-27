/* Stellar Settings grouping v22 */
(()=>{
  function el(tag,cls,text){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text)node.textContent=text;
    return node;
  }
  function addBefore(target,text){
    if(!target||target.previousElementSibling?.classList.contains('settings-section-label'))return;
    target.insertAdjacentElement('beforebegin',el('div','settings-section-label',text));
  }
  function addDividerBefore(target){
    if(!target||target.previousElementSibling?.classList.contains('settings-divider'))return;
    target.insertAdjacentElement('beforebegin',el('div','settings-divider'));
  }
  function setup(){
    const grid=document.querySelector('#settings-panel .settings-grid');
    if(!grid||grid.dataset.grouped==='1')return;
    grid.dataset.grouped='1';
    const auth=document.getElementById('auth-settings-row');
    const plugins=document.querySelector('#settings-panel a[href="/plugins"]');
    const desktop=document.getElementById('desktop-agent-nav');
    const advanced=document.getElementById('settings-advanced-toggle');
    const billing=document.getElementById('set-billing-row');
    const topup=document.getElementById('topup-row');
    const support=document.querySelector('#settings-panel a[href="/support"]');
    const legal=document.querySelector('#settings-panel a[href="/legal"]');
    if(auth) addBefore(auth,'Account');
    if(plugins){ addDividerBefore(plugins); addBefore(plugins,'Tools'); }
    if(desktop&&!desktop.previousElementSibling?.classList.contains('settings-section-label')) addBefore(desktop,'Work with Stellar');
    if(billing){ addDividerBefore(billing); addBefore(billing,'Billing'); }
    if(topup && !billing) addBefore(topup,'Billing');
    if(support){ addDividerBefore(support); addBefore(support,'Help'); }
    if(advanced){ addDividerBefore(advanced); addBefore(advanced,'Advanced'); }
    if(legal && !support) addBefore(legal,'Help');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  window.addEventListener('pageshow',setup);
})();
