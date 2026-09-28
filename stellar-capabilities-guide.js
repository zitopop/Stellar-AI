(() => {
  'use strict';

  if (window.__stellarSideSettingsPolishV1) return;
  window.__stellarSideSettingsPolishV1 = true;

  const SETTINGS_ITEMS = [
    ['Account', 'Who you are', 'Your sign-in, email and saved workspace identity.'],
    ['Credits', 'Usage meter', 'Shows remaining AI usage, free credits, monthly credits and top-ups.'],
    ['Plans', 'Money bit', 'Compare Free, Starter, Plus and Pro before upgrading.'],
    ['Models', 'Brain strength', 'Pick faster or stronger AI depending on the job.'],
    ['Voice', 'Talk to AI', 'Control microphone, language and spoken replies.'],
    ['Plugins', 'Connected apps', 'Connect outside tools only when needed.'],
    ['Privacy', 'Safety', 'Understand data, account safety and user controls.'],
    ['Support', 'Help', 'Get help with billing, credits, bugs or account access.'],
  ];

  const SIDE_HELP = [
    [/new|build|compose|start/i, ['New task', 'Start a fresh Stellar task.']],
    [/home|chat|workspace/i, ['Home', 'Open the main AI workspace.']],
    [/work|task|agent/i, ['Work', 'Turn fixes, website jobs and business work into clear tasks.']],
    [/credit|usage|wallet/i, ['Credits', 'See usage, limits and top-ups.']],
    [/plan|price|upgrade|billing/i, ['Plans', 'Compare plans and upgrades.']],
    [/model/i, ['Models', 'Choose the AI strength.']],
    [/voice|mic|call/i, ['Voice', 'Speak to Stellar.']],
    [/file|download/i, ['Files', 'Open generated files.']],
    [/setting|preference/i, ['Settings', 'Control account, credits, plans, voice, privacy and support.']],
    [/support|help/i, ['Support', 'Get help.']],
  ];

  const TAB_LABELS = {
    account:'Who you are', profile:'Who you are', credits:'Usage meter', plan:'Money bit', billing:'Money bit', models:'Brain strength', voice:'Talk to AI', plugins:'Connected apps', privacy:'Safety', support:'Help', preferences:'App feel', about:'Info'
  };

  function isAppPage(){ return /\/app(?:\.html)?\/?$/i.test(location.pathname) || !!document.querySelector('.app'); }
  function clean(value){ return String(value || '').replace(/\s+/g, ' ').trim(); }

  function addStyles(){
    if(document.getElementById('stellar-side-settings-polish-style-v1')) return;
    const style=document.createElement('style');
    style.id='stellar-side-settings-polish-style-v1';
    style.textContent=`
      #sidebar [data-sidebar-label],.sidebar [data-sidebar-label]{position:relative!important}
      #sidebar [data-sidebar-label]::after,.sidebar [data-sidebar-label]::after{content:attr(data-sidebar-label);position:fixed;left:76px;z-index:6000;max-width:240px;display:none;padding:8px 10px;border:1px solid rgba(185,176,255,.22);border-radius:12px;background:rgba(12,14,22,.97);color:#eef1f8;font-size:11px;font-weight:800;line-height:1.35;box-shadow:0 16px 44px rgba(0,0,0,.38);pointer-events:none}
      #sidebar [data-sidebar-label]:hover::after,#sidebar [data-sidebar-label]:focus-visible::after,.sidebar [data-sidebar-label]:hover::after,.sidebar [data-sidebar-label]:focus-visible::after{display:block}
      #sidebar .stellar-side-mini,.sidebar .stellar-side-mini{display:block;margin-top:3px;color:#8f98ad;font-size:10px;font-weight:760;line-height:1.18;max-width:138px;white-space:normal}
      #sidebar.collapsed .stellar-side-mini,.stellar-sidebar-compact #sidebar .stellar-side-mini{display:none!important}
      #settings-modal .set-tab[data-plain-label]::after{content:attr(data-plain-label);display:block;margin-top:2px;color:#858da0;font-size:9px;font-weight:700;line-height:1.1;text-transform:none;letter-spacing:0}
      #settings-modal .set-tab.active[data-plain-label]::after{color:#d6d0ff}
      #settings-modal .stellar-settings-explainer{width:100%;margin:0 0 16px;padding:14px;border:1px solid rgba(185,176,255,.16);border-radius:20px;background:linear-gradient(145deg,rgba(139,124,246,.16),rgba(255,255,255,.024));box-shadow:0 18px 55px rgba(0,0,0,.18)}
      #settings-modal .stellar-settings-explainer strong{display:block;color:#f6f7fb;font-size:15px;letter-spacing:-.02em}#settings-modal .stellar-settings-explainer p{margin:5px 0 12px;color:#aeb6c6;font-size:12px;line-height:1.5}
      #settings-modal .stellar-settings-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}#settings-modal .stellar-settings-card{padding:12px;border:1px solid rgba(255,255,255,.085);border-radius:15px;background:rgba(8,10,18,.54)}#settings-modal .stellar-settings-card b{display:block;color:#f5f7fb;font-size:12.5px}#settings-modal .stellar-settings-card small{display:inline-flex;margin:6px 0 7px;min-height:22px;align-items:center;padding:0 7px;border-radius:999px;border:1px solid rgba(242,216,121,.22);background:rgba(242,216,121,.07);color:#f7e4a1;font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}#settings-modal .stellar-settings-card span{display:block;color:#a1aabc;font-size:11px;line-height:1.42}
      #settings-modal .stellar-settings-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#settings-modal .stellar-settings-actions a{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:rgba(255,255,255,.04);color:#f2f4f8;font-size:11px;font-weight:850;text-decoration:none}#settings-modal .stellar-settings-actions a:first-child{background:#f3f0ff;color:#101218;border-color:#f3f0ff}
      @media(max-width:640px){#settings-modal .set-tab[data-plain-label]::after{display:none!important}#settings-modal .stellar-settings-map{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function meaning(raw){
    const text=clean(raw).replace(/^[+＋✦⌘\s]+/,'');
    for(const [pattern,pair] of SIDE_HELP) if(pattern.test(text)) return pair;
    return [text || 'Open', text ? `Open ${text}.` : 'Open this section.'];
  }

  function installSidebar(){
    const sidebar=document.querySelector('#sidebar,.sidebar,[data-sidebar]');
    if(!sidebar) return;
    sidebar.querySelectorAll('a,button,[role="button"]').forEach((control)=>{
      if(!(control instanceof HTMLElement)) return;
      const raw=clean(control.getAttribute('aria-label') || control.getAttribute('title') || control.textContent);
      const [name, detail]=meaning(raw);
      const full=`${name} — ${detail}`;
      control.dataset.sidebarLabel=full;
      control.setAttribute('title', full);
      if(!control.getAttribute('aria-label')) control.setAttribute('aria-label', full);
      const hasVisibleText=clean(control.textContent).length > 1;
      if(hasVisibleText && !control.querySelector('.stellar-side-mini')){
        const mini=document.createElement('span');
        mini.className='stellar-side-mini';
        mini.textContent=detail;
        control.appendChild(mini);
      }
    });
  }

  function installTabLabels(){
    document.querySelectorAll('#settings-modal .set-tab,[data-settings-tab],.settings-tab').forEach((tab)=>{
      const raw=clean(tab.dataset.tab || tab.getAttribute('aria-label') || tab.textContent);
      const key=raw.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      const label=TAB_LABELS[key] || TAB_LABELS[raw.toLowerCase()] || 'Open section';
      tab.dataset.plainLabel=label;
      if(!tab.getAttribute('title')) tab.setAttribute('title', `${raw || 'Settings'} — ${label}`);
      if(!tab.getAttribute('aria-label')) tab.setAttribute('aria-label', `${raw || 'Settings'} — ${label}`);
    });
  }

  function settingsGuide(){
    const node=document.createElement('section');
    node.className='stellar-settings-explainer';
    node.dataset.stellarSettingsExplainer='true';
    node.setAttribute('aria-label','Settings explained');
    node.innerHTML='<strong>Settings control room</strong><p>Settings should show what you have, what you can change, and what costs money.</p>';
    const grid=document.createElement('div');
    grid.className='stellar-settings-map';
    SETTINGS_ITEMS.forEach(([name,label,detail])=>{
      const card=document.createElement('article');
      card.className='stellar-settings-card';
      card.innerHTML=`<b>${name}</b><small>${label}</small><span>${detail}</span>`;
      grid.appendChild(card);
    });
    const actions=document.createElement('div');
    actions.className='stellar-settings-actions';
    actions.innerHTML='<a href="/plans">Compare plans</a><a href="/settings-guide">Full guide</a><a href="/support">Get support</a>';
    node.append(grid, actions);
    return node;
  }

  function installSettingsGuide(){
    const modal=document.querySelector('#settings-modal,.settings-panel,[data-settings-panel]');
    if(!modal) return;
    const existing=modal.querySelector('[data-stellar-settings-explainer="true"]');
    const next=settingsGuide();
    if(existing) existing.replaceWith(next);
    else (modal.querySelector('.set-panel:not([style*="display: none"]),.set-panel,.settings-card,.set-body') || modal).prepend(next);
    installTabLabels();
  }

  function install(){
    if(!isAppPage()) return;
    addStyles();
    installSidebar();
    installSettingsGuide();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();

  let queued=false;
  new MutationObserver(()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{ queued=false; install(); });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-label','title']});
})();