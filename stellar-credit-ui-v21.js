/* Stellar AI — visible credit balance + UI bridge v21 */
(()=>{
  const $=id=>document.getElementById(id);
  const format=n=>Number.isFinite(n)?Math.max(0,n).toLocaleString():'—';
  function parseCreditText(text=''){
    const match=String(text).match(/([\d,]+)\s+credits/i);
    if(!match)return null;
    const n=Number(match[1].replace(/,/g,''));
    return Number.isFinite(n)?n:null;
  }
  function ensureCreditPill(){
    const buttons=[...document.querySelectorAll('.top-actions .top-plans')];
    const btn=buttons.find(el=>/credits/i.test(el.textContent||''))||buttons[0];
    if(!btn)return null;
    btn.classList.add('stellar-credit-pill');
    if(!$('stellar-credit-balance')){
      btn.innerHTML='<span class="stellar-credit-icon" aria-hidden="true">✦</span><span class="stellar-credit-balance" id="stellar-credit-balance">—</span><span class="stellar-credit-label">credits</span>';
      btn.setAttribute('aria-label','Open credits wallet');
      btn.title='Credits available';
    }
    return btn;
  }
  function ensureWalletSummary(){
    const hero=document.querySelector('.settings-plan-hero');
    if(!hero||$('stellar-wallet-summary'))return;
    const summary=document.createElement('div');
    summary.id='stellar-wallet-summary';
    summary.className='stellar-wallet-summary';
    summary.innerHTML='<span>Credit balance</span><strong id="stellar-wallet-total">—</strong>';
    hero.insertAdjacentElement('afterend',summary);
  }
  function syncCredits(){
    ensureCreditPill();
    ensureWalletSummary();
    const top=$('top-usage');
    const usage=$('usage-copy');
    let total=parseCreditText(top?.textContent||'');
    if(total===null) total=parseCreditText(usage?.textContent||'');
    const balance=$('stellar-credit-balance');
    const wallet=$('stellar-wallet-total');
    if(balance)balance.textContent=total===null?'—':format(total);
    if(wallet)wallet.textContent=total===null?'Sign in to view':format(total)+' credits';
    const btn=document.querySelector('.stellar-credit-pill');
    if(btn&&total!==null)btn.title=format(total)+' credits available';
  }
  function observe(){
    ['top-usage','usage-copy'].forEach(id=>{
      const node=$(id);
      if(node)new MutationObserver(syncCredits).observe(node,{subtree:true,childList:true,characterData:true});
    });
    new MutationObserver(syncCredits).observe(document.body,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{syncCredits();observe()},{once:true});
  else {syncCredits();observe();}
  window.addEventListener('pageshow',syncCredits);
  window.addEventListener('focus',syncCredits);
  setTimeout(syncCredits,300);
  setTimeout(syncCredits,1200);
})();
