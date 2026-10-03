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
    if(usage&&/loading/i.test(usage.textContent||''))usage.textContent=isSignedIn()?'Usage ready':'Free usage';
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

/* Stellar chat actions polish — labels pin, rename and delete safely without changing chat data. */
(()=>{
  if(window.__stellarChatActionsPolishV1)return;
  window.__stellarChatActionsPolishV1=true;

  const ACTION_COPY={
    pin:{label:'Pin chat',short:'Pin',icon:'📌'},
    rename:{label:'Rename chat',short:'Rename',icon:'✎'},
    delete:{label:'Delete chat',short:'Delete',icon:'⌫'}
  };

  function status(message,type='warn'){
    try{ if(typeof setStatus==='function'){setStatus(message,type);return;} }catch{}
    const el=document.getElementById('status');
    if(el){el.textContent=message;el.className='status '+type;}
  }

  function textFor(el){
    return [el?.textContent,el?.getAttribute?.('aria-label'),el?.getAttribute?.('title'),el?.dataset?.action,el?.dataset?.chatAction,el?.className]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function detectAction(el){
    const text=textFor(el);
    if(/rename|edit title|edit chat|pencil|title/.test(text))return 'rename';
    if(/delete|remove|trash|danger|erase|⌫|×/.test(text))return 'delete';
    if(/unpin|pin|pinned|📌/.test(text))return 'pin';
    return '';
  }

  function rowFor(el){
    return el?.closest?.('.chat-history-item,[data-chat-row],.saved-chat-row,li');
  }

  function isPinned(row){
    if(!row)return false;
    try{
      if(row.matches?.('[data-pinned="true"],[aria-pressed="true"].pinned,.pinned'))return true;
    }catch{}
    return /pinned|📌/.test(row.textContent||'')||!!row.querySelector?.('.pin-mark,[data-pin-state="pinned"],[aria-label*="Pinned"],[title*="Pinned"],[data-pinned="true"]');
  }

  function polishRow(row){
    if(!row)return;
    const pinned=isPinned(row);
    row.classList.toggle('stellar-chat-pinned',pinned);
    row.dataset.stellarPinned=pinned?'true':'false';
    const main=row.querySelector('button:not(.stellar-chat-action),a:not(.stellar-chat-action),.chat-title,.chat-name,strong')||row;
    if(main&&!main.getAttribute?.('title')){
      const label=(main.textContent||row.textContent||'Chat').trim().replace(/\s+/g,' ').slice(0,90);
      if(label)main.setAttribute?.('title',label);
    }
  }

  function polishButton(btn){
    const action=detectAction(btn);
    if(!action)return;
    const copy=ACTION_COPY[action];
    btn.classList.add('stellar-chat-action');
    btn.dataset.stellarChatAction=action;
    btn.type='button';
    const row=rowFor(btn);
    const label=action==='pin'&&isPinned(row)?'Unpin chat':copy.label;
    btn.setAttribute('aria-label',label);
    btn.setAttribute('title',label);
    if(row)polishRow(row);
    if(action==='delete'&&isPinned(row)){
      btn.setAttribute('aria-disabled','true');
      btn.classList.add('is-disabled');
      btn.setAttribute('title','Unpin this chat before deleting');
      btn.setAttribute('aria-label','Unpin this chat before deleting');
    }else{
      btn.removeAttribute('aria-disabled');
      btn.classList.remove('is-disabled');
    }
  }

  function polish(){
    document.querySelectorAll('.chat-history-item,[data-chat-row],#saved-chat-list li,.saved-chat-list li').forEach(polishRow);
    document.querySelectorAll('.chat-actions button,.chat-actions a,.chat-history-item button,.chat-history-item a,[data-chat-row] button,[data-chat-row] a').forEach(polishButton);
    document.querySelectorAll('.chat-actions').forEach(actions=>{
      actions.setAttribute('aria-label','Chat actions: pin, rename and delete');
      actions.dataset.stellarPolished='true';
    });
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('.stellar-chat-action[data-stellar-chat-action="delete"],.chat-actions button,.chat-actions a');
    if(!btn)return;
    if(detectAction(btn)!=='delete')return;
    const row=rowFor(btn);
    if(!isPinned(row))return;
    event.preventDefault();
    event.stopPropagation();
    status('Pinned chats are protected. Unpin first before deleting.','warn');
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish,{once:true});
  else polish();
  new MutationObserver(polish).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('pageshow',polish);
  window.addEventListener('focus',polish);
  [300,900,1800,3500].forEach(delay=>setTimeout(polish,delay));
})();

/* Stellar settings spacing guard — re-applies stacked text rules every time Settings opens. */
(()=>{
  if(window.__stellarSettingsSpacingGuardV1)return;
  window.__stellarSettingsSpacingGuardV1=true;
  const css=`
    .panel .account-title,.settings-card .account-title,.account-title{display:grid!important;gap:4px!important;min-width:0!important;line-height:1.2!important}
    .panel .account-title strong,.settings-card .account-title strong,.account-title strong{display:block!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.18!important}
    .panel .account-title small,.settings-card .account-title small,.account-title small{display:block!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.32!important;color:#a9b2c1!important}
    .panel .settings-row,.settings-card .settings-row,.settings-row{align-items:center!important;gap:12px!important;min-height:58px!important;padding:12px!important}
    .panel .settings-row .copy,.settings-card .settings-row .copy,.settings-row .copy{display:grid!important;gap:3px!important;min-width:0!important;flex:1 1 auto!important;line-height:1.2!important}
    .panel .settings-row .copy strong,.settings-card .settings-row .copy strong,.settings-row .copy strong{display:block!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.22!important}
    .panel .settings-row .copy small,.settings-card .settings-row .copy small,.settings-row .copy small{display:block!important;margin:0!important;white-space:normal!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.35!important;color:#8f98a7!important}
    @media(max-width:640px){.panel .settings-row .copy small,.settings-card .settings-row .copy small,.settings-row .copy small{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}.panel .account-title small,.settings-card .account-title small,.account-title small{max-width:calc(100vw - 132px)!important}}
  `;
  function inject(){
    if(document.getElementById('stellar-settings-spacing-guard'))return;
    const style=document.createElement('style');
    style.id='stellar-settings-spacing-guard';
    style.textContent=css;
    document.head.appendChild(style);
  }
  function polish(){
    inject();
    document.querySelectorAll('.account-title,.settings-row .copy').forEach(el=>{
      el.style.display='grid';
      el.style.minWidth='0';
    });
    document.querySelectorAll('.account-title strong,.account-title small,.settings-row .copy strong,.settings-row .copy small').forEach(el=>{
      el.style.display='block';
      el.style.margin='0';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish,{once:true});
  else polish();
  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-open="settings"],#accountButton,#account-button,.settings-row'))setTimeout(polish,60);
  });
  new MutationObserver(polish).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',polish);
  [250,800,1600,3000].forEach(delay=>setTimeout(polish,delay));
})();
