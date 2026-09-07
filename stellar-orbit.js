(() => {
  'use strict';

  const TIERS = Object.freeze({
    fabie:{name:'Spark',mode:'Fast',symbol:'✦',desc:'Quick drafts, small fixes and lightweight work.'},
    smart:{name:'Star',mode:'Balanced',symbol:'★',desc:'Recommended for most Roblox and FiveM builds.'},
    comet:{name:'Comet',mode:'Deep',symbol:'☄',desc:'Architecture, debugging and larger multi-file systems.'},
    ultra:{name:'Nova',mode:'Max',symbol:'✺',desc:'Highest-capability Stellar tier for difficult project work.',pro:true}
  });
  const state={selected:'smart',syncing:false};

  function selectedKey(){
    const checked=document.querySelector('#model-menu [data-model-choice][aria-checked="true"]');
    const key=checked?.getAttribute('data-model-choice');
    return TIERS[key]?key:state.selected;
  }
  function tierMarkup(key){
    const t=TIERS[key];
    return `<div class="stellar-model-line"><span class="stellar-model-symbol" aria-hidden="true">${t.symbol}</span><span class="stellar-model-name">${t.name}</span><span class="stellar-model-mode">${t.mode}</span>${t.pro?'<span class="stellar-model-pro">PRO</span>':''}</div><span class="stellar-model-desc">${t.desc}</span>`;
  }
  function decorateTierButtons(){
    Object.entries(TIERS).forEach(([key,t])=>{
      const b=document.querySelector(`#model-menu [data-model-choice="${key}"]`);
      if(!b)return;
      b.dataset.stellarTier=t.mode.toLowerCase();
      b.setAttribute('aria-label',`Select ${t.name} — ${t.mode}. ${t.desc}${t.pro?' Pro plan.':''}`);
      b.setAttribute('title',`${t.name} · ${t.mode} — ${t.desc}`);
      const copy=b.firstElementChild;
      if(copy&&!copy.querySelector('.stellar-model-line')) copy.innerHTML=tierMarkup(key);
    });
  }
  function decorateMenu(){
    const menu=document.getElementById('model-menu');
    if(!menu)return;
    menu.setAttribute('aria-label','Choose Stellar intelligence level');
    const h=menu.querySelector('.model-menu-heading');
    if(h)h.innerHTML='<span>Stellar intelligence</span><span>speed ↔ depth</span>';
    if(!menu.querySelector('.stellar-model-ladder')){
      const ladder=document.createElement('div');
      ladder.className='stellar-model-ladder';
      ladder.setAttribute('aria-hidden','true');
      ladder.innerHTML='<span>Fast</span><span>Balanced</span><span>Deep</span><span>Max</span>';
      h?.insertAdjacentElement('afterend',ladder);
    }
    if(!menu.querySelector('.stellar-model-note')){
      const note=document.createElement('div');
      note.className='stellar-model-note';
      note.innerHTML='<strong>Stellar tiers</strong> describe speed and depth. Your existing plan still controls which tiers are available.';
      const plans=[...menu.querySelectorAll('button')].find(b=>/see all plans/i.test(b.textContent||''));
      if(plans)plans.insertAdjacentElement('beforebegin',note);else menu.appendChild(note);
    }
    decorateTierButtons();
  }
  function ensureSpaceStrip(){
    const side=document.getElementById('sidebar');
    if(!side||side.querySelector('.stellar-space-strip'))return;
    const brand=side.querySelector('.sidebar-brand-row');
    if(!brand)return;
    const strip=document.createElement('div');
    strip.className='stellar-space-strip';
    strip.setAttribute('role','status');strip.setAttribute('aria-live','polite');
    strip.innerHTML='<span class="stellar-space-orbit" aria-hidden="true">✦</span><span class="stellar-space-copy"><span class="stellar-space-kicker">Stellar Orbit</span><span class="stellar-space-model" data-stellar-model>Star · Balanced</span></span><span class="stellar-space-depth" data-stellar-depth>Balanced</span>';
    brand.insertAdjacentElement('afterend',strip);
  }
  function ensureOrbitLinks(){
    const side=document.getElementById('sidebar');
    if(!side||side.querySelector('.stellar-orbit-links'))return;
    const search=side.querySelector('#search');
    if(!search)return;
    const nav=document.createElement('nav');
    nav.className='stellar-orbit-links';nav.setAttribute('aria-label','Stellar resources');
    nav.innerHTML='<a class="stellar-orbit-link" href="/models"><span aria-hidden="true">✦</span> Models</a><a class="stellar-orbit-link" href="/blog"><span aria-hidden="true">⌁</span> Guides</a>';
    search.insertAdjacentElement('afterend',nav);
  }
  function enhanceSettings(){
    const modal=document.getElementById('settings-modal');
    if(!modal)return;
    modal.setAttribute('data-stellar-orbit','v2');
    const subtitle=modal.querySelector('.settings-subtitle');
    if(subtitle)subtitle.textContent='Account, models, usage and workspace preferences.';
    const card=modal.querySelector('.set-card');
    const head=modal.querySelector('.set-head');
    if(card&&head&&!card.querySelector('.stellar-settings-hero')){
      const hero=document.createElement('div');
      hero.className='stellar-settings-hero';
      hero.innerHTML='<div class="stellar-settings-hero-copy"><strong>🌌 Stellar Orbit</strong><span>Tune how Stellar looks, thinks and supports your builds.</span></div><div class="stellar-settings-shortcuts"><button type="button" data-orbit-models>AI & models</button><button type="button" data-orbit-usage>Usage</button><a href="/blog">Guides</a></div>';
      head.insertAdjacentElement('afterend',hero);
      hero.querySelector('[data-orbit-models]')?.addEventListener('click',()=>{
        try{window.closeSettings?.();}catch{}
        setTimeout(()=>document.getElementById('model-btn')?.click(),40);
      });
      hero.querySelector('[data-orbit-usage]')?.addEventListener('click',()=>{
        try{window.closeSettings?.();window.openUsage?.();}catch{}
      });
    }
  }
  function syncLabel(){
    const key=selectedKey(),t=TIERS[key]||TIERS.smart;state.selected=key;
    const b=document.getElementById('model-btn'),text=`${t.symbol} ${t.name} · ${t.mode} ▾`;
    if(b&&b.textContent.trim()!==text&&!state.syncing){state.syncing=true;b.textContent=text;b.setAttribute('aria-label',`Choose Stellar intelligence. Current: ${t.name}, ${t.mode}.`);b.setAttribute('title',`${t.name} · ${t.mode}`);state.syncing=false;}
    document.querySelectorAll('[data-stellar-model]').forEach(n=>n.textContent=`${t.name} · ${t.mode}`);
    document.querySelectorAll('[data-stellar-depth]').forEach(n=>n.textContent=t.mode);
  }
  function observe(){
    const menu=document.getElementById('model-menu'),button=document.getElementById('model-btn');if(!menu)return;
    new MutationObserver(()=>{decorateTierButtons();syncLabel();}).observe(menu,{subtree:true,attributes:true,attributeFilter:['aria-checked']});
    if(button)new MutationObserver(()=>{if(!state.syncing)syncLabel();}).observe(button,{childList:true,characterData:true,subtree:true});
    const settings=document.getElementById('settings-modal');
    if(settings)new MutationObserver(()=>enhanceSettings()).observe(settings,{subtree:true,childList:true});
  }
  function addSchema(){
    if(document.querySelector('script[data-stellar-app-schema]'))return;
    const s=document.createElement('script');s.type='application/ld+json';s.dataset.stellarAppSchema='v2';
    s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'SoftwareApplication',name:'Stellar AI',applicationCategory:'DeveloperApplication',operatingSystem:'Web',url:'https://trystellarai.com/app',description:'AI development workspace for Roblox Luau and FiveM projects.',featureList:['Roblox Luau development','FiveM QBCore development','FiveM ESX development','Multi-file project generation','Code fixing and iteration']});document.head.appendChild(s);
  }
  function init(){
    document.body.classList.add('stellar-orbit-v2');
    decorateMenu();ensureSpaceStrip();ensureOrbitLinks();enhanceSettings();
    syncLabel();observe();addSchema();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
