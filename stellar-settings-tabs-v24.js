/* Stellar Settings tabs v24 */
(()=>{
  const groups={
    account:['auth-settings-row','settings-signout-row','referral-row'],
    plan:['settings-plan-actions','set-billing-row','topup-row'],
    tools:['desktop-agent-nav','email-agent-nav'],
    help:[],
    owner:['settings-advanced-toggle','roblox-studio-nav','deploy-center-nav','owner-call-now','owner-call-health-btn','owner-push-enable','owner-push-test','owner-call-setup']
  };
  const q=s=>document.querySelector(s);
  function rows(){return [...document.querySelectorAll('#settings-panel .settings-grid > .settings-row,#settings-panel .settings-grid > .stellar-wallet-summary')]}
  function tabFor(el){
    if(!el)return 'account';
    if(el.classList?.contains('settings-plan-hero')||el.classList?.contains('stellar-wallet-summary'))return 'plan';
    if(groups.plan.includes(el.id))return 'plan';
    if(groups.tools.includes(el.id)||el.matches?.('a[href="/plugins"]'))return 'tools';
    if(groups.owner.includes(el.id)||el.matches?.('[data-settings-advanced]'))return 'owner';
    if(el.matches?.('a[href="/support"],a[href="/legal"]'))return 'help';
    return 'account';
  }
  function ownerAvailable(){
    const toggle=document.getElementById('settings-advanced-toggle');
    return !!toggle && !toggle.hidden && toggle.getAttribute('aria-hidden')!=='true';
  }
  function ensureTabs(){
    const card=q('#settings-panel .settings-card');
    const grid=q('#settings-panel .settings-grid');
    if(!card||!grid)return;
    let nav=card.querySelector('.stellar-settings-tabs');
    if(!nav){
      nav=document.createElement('div');
      nav.className='stellar-settings-tabs';
      nav.setAttribute('role','tablist');
      const items=[['account','Account'],['plan','Credits & plan'],['tools','Tools'],['help','Help'],['owner','Owner']];
      for(const [id,label] of items){
        const b=document.createElement('button');
        b.type='button';b.className='stellar-settings-tab';b.dataset.settingsTab=id;b.textContent=label;
        b.setAttribute('role','tab');b.setAttribute('aria-selected','false');
        b.addEventListener('click',()=>show(id));
        nav.appendChild(b);
      }
      card.insertBefore(nav,grid);
    }
    const ownerTab=nav.querySelector('[data-settings-tab="owner"]');
    if(ownerTab)ownerTab.hidden=!ownerAvailable();
  }
  function annotate(){
    ensureTabs();
    rows().forEach(el=>{if(!el.dataset.settingsPage)el.dataset.settingsPage=tabFor(el)});
  }
  function show(name='account'){
    annotate();
    if(name==='owner'&&!ownerAvailable())name='account';
    document.querySelectorAll('.stellar-settings-tab').forEach(b=>{
      const active=b.dataset.settingsTab===name;
      b.setAttribute('aria-selected',String(active));
      b.tabIndex=active?0:-1;
    });
    rows().forEach(el=>{
      const page=el.dataset.settingsPage||tabFor(el);
      el.dataset.stSettingsHidden=page===name?'false':'true';
    });
    const grid=q('#settings-panel .settings-grid');
    if(grid)grid.scrollTop=0;
    try{sessionStorage.setItem('stellar-settings-tab-v24',name)}catch{}
  }
  function current(){
    try{return sessionStorage.getItem('stellar-settings-tab-v24')||'account'}catch{return 'account'}
  }
  function sync(){
    annotate();
    const panel=q('#settings-panel');
    if(panel&&panel.getAttribute('aria-hidden')==='false')show(current());
  }
  function observeSettings(){
    const panel=q('#settings-panel');
    if(!panel||panel.dataset.stellarTabsObserver==='1')return;
    panel.dataset.stellarTabsObserver='1';
    new MutationObserver(()=>{
      ensureTabs();
      const o=panel.querySelector('.stellar-settings-tab[data-settings-tab="owner"]');
      if(o)o.hidden=!ownerAvailable();
    }).observe(panel,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-hidden']});
  }
  window.StellarSettingsTabs={show,sync};
  const start=()=>{sync();observeSettings()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
