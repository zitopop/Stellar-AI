/* Stellar app focus v23 */
(()=>{
  const $=id=>document.getElementById(id);
  const STARTERS=[
    ['Build a website','Build me a clean modern website. Ask only for essential details, then give me the structure and next steps.'],
    ['Fix my code','Help me debug my code. I will paste the code and error; find the likely cause, explain it clearly, and give me the safest fix.'],
    ['Plan a task','Turn my goal into a simple step-by-step plan with priorities, dependencies, and the first action I should take.'],
    ['Research something','Research this topic carefully and give me the key facts, trade-offs, and practical next steps.']
  ];
  function addStarters(){
    const welcome=$('welcomeShell');
    if(!welcome||welcome.querySelector('.stellar-starters'))return;
    const wrap=document.createElement('div');
    wrap.className='stellar-starters';
    wrap.setAttribute('aria-label','Starter prompts');
    STARTERS.forEach(([label,prompt])=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='stellar-starter';
      b.textContent=label;
      b.addEventListener('click',()=>{
        const input=$('prompt');
        if(!input)return;
        input.value=prompt;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.focus();
        input.setSelectionRange(input.value.length,input.value.length);
      });
      wrap.appendChild(b);
    });
    welcome.appendChild(wrap);
  }
  function improveEmptyCopy(){
    const empty=$('saved-chat-empty');
    if(empty&&/No saved chats yet/i.test(empty.textContent||''))empty.textContent='Your recent chats will appear here.';
  }
  function parseCredits(){
    const top=$('top-usage');
    const usage=$('usage-copy');
    const source=(top?.textContent||'')+' '+(usage?.textContent||'');
    const m=source.match(/([\d,]+)\s+credits/i);
    return m?Number(m[1].replace(/,/g,'')):null;
  }
  function syncCreditContext(){
    const total=parseCredits();
    const pill=document.querySelector('.stellar-credit-pill');
    if(pill&&Number.isFinite(total)){
      const spark=Math.floor(total/2);
      const star=Math.floor(total/5);
      pill.title=`${total.toLocaleString()} credits available · about ${star.toLocaleString()} Star or ${spark.toLocaleString()} Spark messages at current per-message costs`;
      pill.setAttribute('aria-label',`Open credits wallet. ${total.toLocaleString()} credits available.`);
    }
    const wallet=$('stellar-wallet-summary');
    if(wallet){
      let note=wallet.querySelector('.stellar-credit-context');
      if(!note){
        note=document.createElement('div');
        note.className='stellar-credit-context';
        wallet.appendChild(note);
      }
      note.textContent=Number.isFinite(total)
        ? `At current costs: about ${Math.floor(total/5).toLocaleString()} Star messages or ${Math.floor(total/2).toLocaleString()} Spark messages.`
        : 'Usage examples appear after your credit balance loads.';
    }
  }
  function sync(){
    addStarters();
    improveEmptyCopy();
    syncCreditContext();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('pageshow',sync);
})();
