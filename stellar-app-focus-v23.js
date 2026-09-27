/* Stellar app focus v23 — chat-only home + credit UI sync */
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

  function creditTotal(){
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
    return Boolean(document.querySelector('.signed-in-only:not([hidden])')) ||
      /sign out/i.test($('settings-signout-row')?.textContent||'');
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

    if(Number.isFinite(total)){
      if(balance)balance.textContent=format(total);
      if(wallet)wallet.textContent=format(total)+' credits';
      if(pill){
        pill.title=format(total)+' credits available';
        pill.setAttribute('aria-label','Open credits wallet. '+format(total)+' credits available.');
      }
    }else{
      if(balance)balance.textContent=isSignedIn()?'…':'Free';
      if(wallet)wallet.textContent=isSignedIn()?'Loading balance…':'Sign in to view';
      if(pill) pill.title=isSignedIn()?'Loading credit balance':'Sign in to view and buy credits';
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

  function sync(){
    removeLegacyStarters();
    improveEmptyCopy();
    syncCreditContext();
  }

  let queued=false;
  function scheduleSync(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;sync()});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',sync,{once:true});
  }else sync();

  new MutationObserver(scheduleSync).observe(document.documentElement,{
    subtree:true,childList:true,characterData:true,attributes:true,
    attributeFilter:['hidden','class','aria-hidden']
  });
  window.addEventListener('pageshow',sync);
  window.addEventListener('focus',sync);
  setTimeout(sync,250);
  setTimeout(sync,1200);
})();
