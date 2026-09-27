/* Stellar app focus v23 — chat-only home + lightweight credit UI sync */
(()=>{
  const $=id=>document.getElementById(id);
  const format=n=>Number.isFinite(n)?Math.max(0,n).toLocaleString():'—';

  function removeLegacyStarters(){
    document.querySelectorAll('.stellar-starters').forEach(node=>node.remove());
  }

  function improveEmptyCopy(){
    const empty=$('saved-chat-empty');
    if(empty&&/No saved chats yet|Your recent chats will appear here/i.test(empty.textContent||'')){
      empty.textContent='Recent chats appear here.';
    }
  }

  function parseCreditsFrom(text=''){
    const value=String(text||'').replace(/\u00a0/g,' ');
    const patterns=[
      /([\d,]+)\s+credits?\b/i,
      /credits?\s*[:·-]?\s*([\d,]+)/i,
      /(?:balance|available|remaining)\s*[:·-]?\s*([\d,]+)/i
    ];
    for(const pattern of patterns){
      const match=value.match(pattern);
      if(!match)continue;
      const n=Number(String(match[1]).replace(/,/g,''));
      if(Number.isFinite(n))return Math.max(0,n);
    }
    return null;
  }

  function ownerUnlimited(){
    try{return typeof isOwner==='function'&&isOwner()}catch{return false}
  }

  function creditTotal(){
    try{
      if(typeof planState!=='undefined'&&planState){
        const included=Math.max(0,Number(planState.remaining||0)||0);
        const wallet=Math.max(0,Number(planState.walletPence||0)||0);
        return included+wallet;
      }
    }catch{}
    const sources=[
      $('top-usage')?.textContent,
      $('usage-copy')?.textContent,
      $('plan-truth')?.textContent,
      $('topup-status')?.textContent
    ].filter(Boolean);
    for(const source of sources){
      const n=parseCreditsFrom(source);
      if(Number.isFinite(n))return n;
    }
    return null;
  }

  function isSignedIn(){
    try{
      if(typeof getSessionToken==='function')return Boolean(getSessionToken());
    }catch{}
    return /sign out/i.test($('settings-signout-row')?.textContent||'');
  }

  function ensureCreditPill(){
    const buttons=[...document.querySelectorAll('.top-actions .top-plans')];
    const btn=buttons.find(el=>/credits/i.test(el.textContent||''))||buttons[0];
    if(!btn)return null;
    btn.classList.add('stellar-credit-pill');
    if(!$('stellar-credit-balance')){
      btn.replaceChildren();
      const icon=document.createElement('span');
      icon.className='stellar-credit-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent='✦';
      const balance=document.createElement('span');
      balance.className='stellar-credit-balance';
      balance.id='stellar-credit-balance';
      balance.textContent='—';
      const label=document.createElement('span');
      label.className='stellar-credit-label';
      label.textContent='credits';
      btn.append(icon,balance,label);
    }
    btn.setAttribute('aria-label','Open credits wallet');
    return btn;
  }

  function ensureWalletSummary(){
    const hero=document.querySelector('.settings-plan-hero');
    if(!hero)return null;
    let summary=$('stellar-wallet-summary');
    if(!summary){
      summary=document.createElement('div');
      summary.id='stellar-wallet-summary';
      summary.className='stellar-wallet-summary';
      summary.innerHTML='<span>Credit balance</span><strong id="stellar-wallet-total">—</strong>';
      hero.insertAdjacentElement('afterend',summary);
    }
    return summary;
  }

  function syncCreditContext(){
    const total=creditTotal();
    const pill=ensureCreditPill();
    ensureWalletSummary();
    const balance=$('stellar-credit-balance');
    const wallet=$('stellar-wallet-total');

    if(ownerUnlimited()){
      if(balance)balance.textContent='∞';
      if(wallet)wallet.textContent='Unlimited credits';
      if(pill){
        pill.title='Owner access · unlimited credits';
        pill.setAttribute('aria-label','Open credits wallet. Owner access with unlimited credits.');
      }
    }else if(Number.isFinite(total)){
      if(balance)balance.textContent=format(total);
      if(wallet)wallet.textContent=format(total)+' credits';
      if(pill){
        pill.title=format(total)+' credits available';
        pill.setAttribute('aria-label','Open credits wallet. '+format(total)+' credits available.');
      }
    }else{
      if(balance)balance.textContent=isSignedIn()?'…':'Free';
      if(wallet)wallet.textContent=isSignedIn()?'Loading balance…':'Sign in to view';
      if(pill)pill.title=isSignedIn()?'Loading credit balance':'Sign in to view and buy credits';
    }

    const summary=$('stellar-wallet-summary');
    if(summary){
      let note=summary.querySelector('.stellar-credit-context');
      if(!note){
        note=document.createElement('div');
        note.className='stellar-credit-context';
        summary.appendChild(note);
      }
      note.textContent=Number.isFinite(total)
        ? 'Included credits are used first. Add-on credits stay in your wallet until used.'
        : 'Your balance appears here after account data loads.';
    }
  }

  function visible(el){
    if(!el||el.hidden||el.getAttribute('aria-hidden')==='true')return false;
    const style=getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||style.pointerEvents==='none')return false;
    const rect=el.getBoundingClientRect();
    return rect.width>0&&rect.height>0;
  }

  function closeStaleBackdrop(){
    const backdrop=$('backdrop');
    if(!backdrop)return;
    const drawerOpen=document.body.classList.contains('drawer-open');
    const settingsOpen=$('settings-panel')?.getAttribute('aria-hidden')==='false';
    const modalOpen=document.body.classList.contains('modal-open')||document.body.classList.contains('auth-open');
    if(!drawerOpen&&!settingsOpen&&!modalOpen){
      backdrop.hidden=true;
      backdrop.setAttribute('aria-hidden','true');
      backdrop.setAttribute('inert','');
      backdrop.style.pointerEvents='none';
    }
  }

  function recoverClosedOverlays(){
    ['settings-panel','welcome-modal','composer-more'].forEach(id=>{
      const el=$(id);
      if(!el)return;
      if(el.hidden||el.getAttribute('aria-hidden')==='true'){
        el.setAttribute('inert','');
        el.style.pointerEvents='none';
      }
    });
    document.querySelectorAll('[hidden], [aria-hidden="true"]').forEach(el=>{
      if(el.id==='settings-panel'||el.id==='welcome-modal'||el.id==='backdrop')el.style.pointerEvents='none';
    });
  }

  function anyIntentionalBlockerOpen(){
    return visible($('settings-panel'))||visible($('welcome-modal'))||document.body.classList.contains('drawer-open');
  }

  function releaseIfStartupStuck(){
    const status=$('status');
    const send=$('sendBtn');
    const stop=$('stopBtn');
    closeStaleBackdrop();
    recoverClosedOverlays();
    if(!anyIntentionalBlockerOpen()){
      document.body.classList.remove('modal-open','auth-open');
      document.documentElement.classList.remove('modal-open','auth-open');
    }
    if(send&&send.disabled&&!visible(stop))send.disabled=false;
    if(stop&&stop.disabled===false&&send&&!send.disabled)stop.disabled=true;
    if(status&&/loading|sending|checking|starting|syncing/i.test(status.textContent||'')){
      status.textContent='Ready';
      status.className='status good';
      status.dataset.idle='true';
    }
    const usage=$('top-usage');
    if(usage&&/loading/i.test(usage.textContent||''))usage.textContent=isSignedIn()?'Credits ready':'Free credits';
  }

  function sync(){
    removeLegacyStarters();
    improveEmptyCopy();
    syncCreditContext();
    closeStaleBackdrop();
    recoverClosedOverlays();
  }

  function attachKnownUpdateHooks(){
    if(!('MutationObserver' in window))return;
    ['top-usage','usage-copy','plan-truth','topup-status','status'].forEach(id=>{
      const node=$(id);
      if(!node||node.dataset.stellarCreditWatch==='1')return;
      node.dataset.stellarCreditWatch='1';
      new MutationObserver(sync).observe(node,{subtree:true,childList:true,characterData:true});
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{sync();attachKnownUpdateHooks()},{once:true});
  }else{
    sync();
    attachKnownUpdateHooks();
  }

  window.addEventListener('pageshow',()=>{sync();setTimeout(releaseIfStartupStuck,900)});
  window.addEventListener('focus',sync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();setTimeout(releaseIfStartupStuck,900)}});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('.stellar-credit-pill,#settings-nav,#account-button,#composer-more-btn,.top-actions button,.side button'))setTimeout(sync,120);
  });
  window.addEventListener('error',()=>setTimeout(releaseIfStartupStuck,250));
  window.addEventListener('unhandledrejection',()=>setTimeout(releaseIfStartupStuck,250));

  [250,900,1800,3500,5200,8000].forEach(delay=>setTimeout(sync,delay));
  [4500,8500,13000].forEach(delay=>setTimeout(releaseIfStartupStuck,delay));
  window.StellarInteractionRecovery={sync,releaseIfStartupStuck};
})();
