/* Stellar Settings grouping v22.1 — account/profile dashboard */
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
