/* Stellar Settings grouping v22.2 — account/profile dashboard */
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
  function cleanText(value){return String(value||'').replace(/\s+/g,' ').trim()}
  function rowText(id,part){
    const row=document.getElementById(id);
    if(!row)return '';
    const node=part==='small'?row.querySelector('small'):part==='strong'?row.querySelector('strong'):row;
    return cleanText(node?.textContent||'');
  }
  function injectProfileStyles(){
    if(document.getElementById('stellar-settings-profile-v22-2'))return;
    const style=document.createElement('style');
    style.id='stellar-settings-profile-v22-2';
    style.textContent=`
      #settings-panel .stellar-profile-summary{margin:12px 12px 8px!important;padding:14px!important;display:grid!important;grid-template-columns:46px minmax(0,1fr) auto!important;gap:12px!important;align-items:center!important;border:1px solid rgba(184,175,255,.18)!important;border-radius:18px!important;background:linear-gradient(135deg,rgba(139,124,246,.13),rgba(255,255,255,.035) 45%,rgba(15,17,24,.96))!important;box-shadow:0 16px 48px rgba(0,0,0,.20)!important;}
      #settings-panel .stellar-profile-avatar{width:46px!important;height:46px!important;border-radius:15px!important;display:grid!important;place-items:center!important;background:linear-gradient(135deg,#d8d0ff,#86f2dd)!important;color:#11131a!important;font-size:20px!important;font-weight:950!important;letter-spacing:-.04em!important;}
      #settings-panel .stellar-profile-main{min-width:0!important;display:grid!important;gap:2px!important;}
      #settings-panel .stellar-profile-kicker{color:#b9b0ff!important;font-size:10px!important;font-weight:900!important;letter-spacing:.14em!important;text-transform:uppercase!important;}
      #settings-panel #stellar-profile-account{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#fff!important;font-size:15px!important;line-height:1.25!important;}
      #settings-panel #stellar-profile-plan{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#aeb7c8!important;font-size:11px!important;line-height:1.35!important;}
      #settings-panel .stellar-profile-actions{display:flex!important;gap:7px!important;align-items:center!important;}
      #settings-panel .stellar-profile-actions button{min-height:36px!important;padding:0 11px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:999px!important;background:rgba(255,255,255,.05)!important;color:#ecebff!important;font-size:11px!important;font-weight:850!important;cursor:pointer!important;}
      #settings-panel .stellar-profile-actions button:hover{background:rgba(184,175,255,.13)!important;border-color:rgba(184,175,255,.26)!important;}
      #settings-panel .stellar-profile-usage{grid-column:2/-1!important;margin:0!important;padding:9px 11px!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:13px!important;background:rgba(0,0,0,.16)!important;color:#aeb7c8!important;font-size:11px!important;line-height:1.55!important;}
      #settings-panel .stellar-settings-tabs{position:sticky!important;top:74px!important;z-index:15!important;display:flex!important;gap:7px!important;padding:9px 12px!important;background:rgba(23,23,27,.94)!important;border-bottom:1px solid rgba(255,255,255,.065)!important;overflow-x:auto!important;scrollbar-width:none!important;}
      #settings-panel .stellar-settings-tabs::-webkit-scrollbar{display:none!important;}
      #settings-panel .stellar-settings-tab{flex:0 0 auto!important;min-height:34px!important;padding:0 12px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:999px!important;background:#202025!important;color:#aeb3c1!important;font-size:11px!important;font-weight:850!important;cursor:pointer!important;}
      #settings-panel .stellar-settings-tab[aria-selected="true"]{background:#f0eefc!important;color:#111218!important;border-color:transparent!important;}
      #settings-panel .settings-grid[data-grouped="1"]{padding-top:8px!important;}
      #settings-panel .settings-row{transition:background .16s ease,border-color .16s ease,transform .16s ease!important;}
      #settings-panel .settings-row:hover{transform:translateY(-1px)!important;}
      @media(max-width:640px){#settings-panel .stellar-profile-summary{margin:9px 8px 7px!important;grid-template-columns:42px minmax(0,1fr)!important;padding:12px!important;border-radius:17px!important}#settings-panel .stellar-profile-avatar{width:42px!important;height:42px!important;border-radius:14px!important}#settings-panel .stellar-profile-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:1fr 1fr!important}#settings-panel .stellar-profile-actions button{min-height:42px!important}#settings-panel .stellar-profile-usage{grid-column:1/-1!important}#settings-panel .stellar-settings-tabs{top:64px!important;padding:8px!important}#settings-panel .stellar-settings-tab{min-height:38px!important}}
    `;
    document.head.appendChild(style);
  }
  function bestAccountText(){
    const auth=document.getElementById('auth-settings-row');
    const small=rowText('auth-settings-row','small');
    const strong=rowText('auth-settings-row','strong');
    const full=cleanText(auth?.textContent||'');
    const email=(full.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0];
    return email||small||strong||'Signed in account';
  }
  function initialFor(value){
    const text=cleanText(value).replace(/^signed in as/i,'').trim();
    return (text[0]||'S').toUpperCase();
  }
  function bestPlanText(){
    const hero=rowText('settings-plan-actions','strong')||rowText('set-billing-row','strong');
    if(hero)return hero;
    const planNode=document.querySelector('[data-current-plan],#current-plan,#plan-name,.plan-name');
    return cleanText(planNode?.textContent)||'Plan and credits';
  }
  function bestUsageText(){
    return cleanText(document.getElementById('usage-copy')?.textContent)||rowText('topup-row','small')||'Check credits, top up, and manage your plan here.';
  }
  function ensureProfileSummary(){
    injectProfileStyles();
    const card=document.querySelector('#settings-panel .settings-card');
    const grid=document.querySelector('#settings-panel .settings-grid');
    if(!card||!grid)return;
    let summary=document.getElementById('stellar-profile-summary');
    if(!summary){
      summary=document.createElement('section');
      summary.id='stellar-profile-summary';
      summary.className='stellar-profile-summary';
      summary.setAttribute('aria-label','Profile summary');
      summary.innerHTML='<div class="stellar-profile-avatar" aria-hidden="true">S</div><div class="stellar-profile-main"><span class="stellar-profile-kicker">Profile</span><strong id="stellar-profile-account">Signed in account</strong><small id="stellar-profile-plan">Plan and credits</small></div><div class="stellar-profile-actions"><button type="button" data-profile-action="plan">Credits</button><button type="button" data-profile-action="tools">Tools</button></div><p id="stellar-profile-usage" class="stellar-profile-usage">Check credits, top up, and manage your plan here.</p>';
      card.insertBefore(summary,card.querySelector('.stellar-settings-tabs')||grid);
      summary.querySelector('[data-profile-action="plan"]')?.addEventListener('click',()=>window.StellarSettingsTabs?.show?.('plan'));
      summary.querySelector('[data-profile-action="tools"]')?.addEventListener('click',()=>window.StellarSettingsTabs?.show?.('tools'));
    }
    const account=bestAccountText();
    const plan=bestPlanText();
    const usage=bestUsageText();
    const avatar=summary.querySelector('.stellar-profile-avatar');
    const accountNode=document.getElementById('stellar-profile-account');
    const planNode=document.getElementById('stellar-profile-plan');
    const usageNode=document.getElementById('stellar-profile-usage');
    if(avatar)avatar.textContent=initialFor(account);
    if(accountNode)accountNode.textContent=account;
    if(planNode)planNode.textContent=plan;
    if(usageNode)usageNode.textContent=usage;
  }
  function setup(){
    const grid=document.querySelector('#settings-panel .settings-grid');
    if(!grid)return;
    ensureProfileSummary();
    if(grid.dataset.grouped==='1')return;
    grid.dataset.grouped='1';
    const auth=document.getElementById('auth-settings-row');
    const plugins=document.querySelector('#settings-panel a[href="/plugins"]');
    const desktop=document.getElementById('desktop-agent-nav');
    const advanced=document.getElementById('settings-advanced-toggle');
    const billing=document.getElementById('set-billing-row');
    const topup=document.getElementById('topup-row');
    const referral=document.getElementById('referral-row');
    const support=document.querySelector('#settings-panel a[href="/support"]');
    const legal=document.querySelector('#settings-panel a[href="/legal"]');
    if(auth) addBefore(auth,'Account');
    if(plugins){ addDividerBefore(plugins); addBefore(plugins,'Tools'); }
    if(desktop&&!desktop.previousElementSibling?.classList.contains('settings-section-label')) addBefore(desktop,'Work with Stellar');
    if(billing){ addDividerBefore(billing); addBefore(billing,'Billing'); }
    if(topup && !billing) addBefore(topup,'Billing');
    if(referral){ addDividerBefore(referral); addBefore(referral,'Rewards'); }
    if(support){ addDividerBefore(support); addBefore(support,'Help'); }
    if(advanced){ addDividerBefore(advanced); addBefore(advanced,'Advanced'); }
    if(legal && !support) addBefore(legal,'Help');
  }
  function observe(){
    const panel=document.getElementById('settings-panel');
    if(!panel||panel.dataset.stellarProfileObserver==='1')return;
    panel.dataset.stellarProfileObserver='1';
    new MutationObserver(()=>ensureProfileSummary()).observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','aria-hidden','class']});
  }
  const start=()=>{setup();observe()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pageshow',start);
})();
