(() => {
  'use strict';

  if (window.__stellarSideSettingsPolishV2) return;
  window.__stellarSideSettingsPolishV2 = true;

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
    account:'Who you are', profile:'Who you are', credits:'Usage meter', usage:'Usage meter', plan:'Money bit', plans:'Money bit', billing:'Money bit', models:'Brain strength', model:'Brain strength', voice:'Talk to AI', plugins:'Connected apps', privacy:'Safety', security:'Safety', support:'Help', preferences:'App feel', about:'Info'
  };

  function isAppPage() {
    return /\/app(?:\.html)?\/?$/i.test(location.pathname) || !!document.querySelector('.app,#sidebar,#settings-modal');
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function addStyles() {
    if (document.getElementById('stellar-side-settings-polish-style-v2')) return;
    const style = document.createElement('style');
    style.id = 'stellar-side-settings-polish-style-v2';
    style.textContent = `
      #sidebar [data-sidebar-label],.sidebar [data-sidebar-label]{position:relative!important}
      #sidebar [data-sidebar-label]::after,.sidebar [data-sidebar-label]::after{content:attr(data-sidebar-label);position:fixed;left:76px;z-index:6000;max-width:250px;display:none;padding:8px 10px;border:1px solid rgba(185,176,255,.22);border-radius:12px;background:rgba(12,14,22,.98);color:#eef1f8;font-size:11px;font-weight:800;line-height:1.35;box-shadow:0 16px 44px rgba(0,0,0,.38);pointer-events:none}
      #sidebar [data-sidebar-label]:hover::after,#sidebar [data-sidebar-label]:focus-visible::after,.sidebar [data-sidebar-label]:hover::after,.sidebar [data-sidebar-label]:focus-visible::after{display:block}
      #sidebar .stellar-side-mini,.sidebar .stellar-side-mini{display:block;margin-top:3px;color:#8f98ad;font-size:10px;font-weight:760;line-height:1.18;max-width:148px;white-space:normal}
      #sidebar.collapsed .stellar-side-mini,.stellar-sidebar-compact #sidebar .stellar-side-mini{display:none!important}
      #sidebar .stellar-work-shortcut,.sidebar .stellar-work-shortcut{min-height:44px;display:flex;align-items:center;gap:10px;margin:6px 8px;padding:0 12px;border:1px solid rgba(185,176,255,.18);border-radius:14px;background:linear-gradient(135deg,rgba(139,124,246,.15),rgba(255,255,255,.035));color:#f4f2ff;text-decoration:none;font-size:13px;font-weight:850}
      #sidebar .stellar-work-shortcut:hover,.sidebar .stellar-work-shortcut:hover{border-color:rgba(242,216,121,.30);background:linear-gradient(135deg,rgba(139,124,246,.22),rgba(242,216,121,.08))}
      #sidebar .stellar-work-shortcut small,.sidebar .stellar-work-shortcut small{display:block;color:#9aa4b8;font-size:10px;font-weight:760;line-height:1.1}
      #settings-modal .set-tab[data-plain-label]::after{content:attr(data-plain-label);display:block;margin-top:2px;color:#858da0;font-size:9px;font-weight:700;line-height:1.1;text-transform:none;letter-spacing:0}
      #settings-modal .set-tab.active[data-plain-label]::after{color:#d6d0ff}
      #settings-modal .stellar-settings-explainer{width:100%;margin:0 0 16px;padding:14px;border:1px solid rgba(185,176,255,.16);border-radius:20px;background:linear-gradient(145deg,rgba(139,124,246,.16),rgba(255,255,255,.024));box-shadow:0 18px 55px rgba(0,0,0,.18)}
      #settings-modal .stellar-settings-explainer strong{display:block;color:#f6f7fb;font-size:15px;letter-spacing:-.02em}#settings-modal .stellar-settings-explainer p{margin:5px 0 12px;color:#aeb6c6;font-size:12px;line-height:1.5}
      #settings-modal .stellar-next-step{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding:12px;border:1px solid rgba(126,232,209,.20);border-radius:16px;background:rgba(126,232,209,.055)}
      #settings-modal .stellar-next-step b{color:#cafff3;font-size:12px}#settings-modal .stellar-next-step span{color:#aeb6c6;font-size:11px;line-height:1.35}
      #settings-modal .stellar-settings-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #settings-modal .stellar-settings-card{padding:12px;border:1px solid rgba(255,255,255,.085);border-radius:15px;background:rgba(8,10,18,.54)}
      #settings-modal .stellar-settings-card b{display:block;color:#f5f7fb;font-size:12.5px}#settings-modal .stellar-settings-card small{display:inline-flex;margin:6px 0 7px;min-height:22px;align-items:center;padding:0 7px;border-radius:999px;border:1px solid rgba(242,216,121,.22);background:rgba(242,216,121,.07);color:#f7e4a1;font-size:9px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}#settings-modal .stellar-settings-card span{display:block;color:#a1aabc;font-size:11px;line-height:1.42}
      #settings-modal .stellar-settings-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}#settings-modal .stellar-settings-actions a{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 11px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:rgba(255,255,255,.04);color:#f2f4f8;font-size:11px;font-weight:850;text-decoration:none}#settings-modal .stellar-settings-actions a:first-child{background:#f3f0ff;color:#101218;border-color:#f3f0ff}
      @media(max-width:640px){#sidebar [data-sidebar-label]::after,.sidebar [data-sidebar-label]::after{display:none!important}#settings-modal .set-tab[data-plain-label]::after{display:none!important}#settings-modal .stellar-settings-map{grid-template-columns:1fr}#settings-modal .stellar-next-step{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function meaning(raw) {
    const text = clean(raw).replace(/^[+＋✦⌘\s]+/, '');
    for (const [pattern, value] of SIDE_HELP) if (pattern.test(text)) return value;
    return text ? [text, 'Open this section.'] : ['Open', 'Open this section.'];
  }

  function annotateSidebar() {
    const sidebar = document.querySelector('#sidebar,.sidebar,[aria-label="Sidebar"]');
    if (!sidebar) return;
    const controls = sidebar.querySelectorAll('a,button,[role="button"]');
    controls.forEach((control) => {
      if (control.classList.contains('modal-x')) return;
      const raw = clean(control.getAttribute('aria-label') || control.getAttribute('title') || control.textContent || '');
      const [name, detail] = meaning(raw);
      control.setAttribute('aria-label', `${name}: ${detail}`);
      control.setAttribute('title', `${name} — ${detail}`);
      control.setAttribute('data-sidebar-label', `${name} — ${detail}`);
      if (!control.querySelector('.stellar-side-mini') && !/^[+✦⌘×]$/.test(raw)) {
        const mini = document.createElement('span');
        mini.className = 'stellar-side-mini';
        mini.textContent = detail;
        control.appendChild(mini);
      }
    });
  }

  function ensureWorkShortcut() {
    const sidebar = document.querySelector('#sidebar,.sidebar,[aria-label="Sidebar"]');
    if (!sidebar || sidebar.querySelector('.stellar-work-shortcut,[href="/work"]')) return;
    const anchor = document.createElement('a');
    anchor.href = '/work';
    anchor.className = 'stellar-work-shortcut';
    anchor.setAttribute('data-sidebar-label', 'Work — Turn fixes, website jobs and business work into clear tasks.');
    anchor.innerHTML = '<span aria-hidden="true">⌘</span><span>Work<small>Tasks & fixes</small></span>';
    const nav = sidebar.querySelector('nav,.stellar-sidebar-nav,#sidebar-nav') || sidebar;
    const before = nav.querySelector('[data-open-settings],.settings,[aria-label*="Settings" i]');
    if (before) before.insertAdjacentElement('beforebegin', anchor);
    else nav.appendChild(anchor);
  }

  function labelSettingsTabs() {
    document.querySelectorAll('#settings-modal .set-tab,#settings-modal [data-tab]').forEach((tab) => {
      const key = clean(tab.dataset.tab || tab.getAttribute('aria-label') || tab.textContent).toLowerCase().replace(/[^a-z]/g, '');
      const label = TAB_LABELS[key] || TAB_LABELS[Object.keys(TAB_LABELS).find((item) => key.includes(item))] || '';
      if (label) tab.dataset.plainLabel = label;
    });
  }

  function buildSettingsExplainer() {
    const section = document.createElement('section');
    section.className = 'stellar-settings-explainer';
    section.dataset.stellarSettingsExplainer = 'true';
    section.innerHTML = '<strong>Settings control room</strong><p>Use Settings to understand what you have, what you can change, and what costs money. The goal is simple: no guessing.</p>';
    const next = document.createElement('div');
    next.className = 'stellar-next-step';
    next.innerHTML = '<div><b>Best next step</b><br><span>Check credits first, then plans only if you need more power.</span></div>';
    section.appendChild(next);
    const grid = document.createElement('div');
    grid.className = 'stellar-settings-map';
    SETTINGS_ITEMS.forEach(([title, pill, detail]) => {
      const card = document.createElement('article');
      card.className = 'stellar-settings-card';
      card.innerHTML = `<b>${title}</b><small>${pill}</small><span>${detail}</span>`;
      grid.appendChild(card);
    });
    section.appendChild(grid);
    const actions = document.createElement('div');
    actions.className = 'stellar-settings-actions';
    actions.innerHTML = '<a href="/plans">Compare plans</a><a href="/work">Open Work</a><a href="/settings-guide">Full guide</a><a href="/support">Get support</a>';
    section.appendChild(actions);
    return section;
  }

  function installSettingsExplainer() {
    const modal = document.querySelector('#settings-modal');
    if (!modal) return;
    const panel = modal.querySelector('.set-panel:not([style*="display: none"]),.set-panel,.set-body') || modal;
    const existing = modal.querySelector('[data-stellar-settings-explainer="true"]');
    if (existing) return;
    panel.prepend(buildSettingsExplainer());
  }

  function install() {
    if (!isAppPage()) return;
    addStyles();
    annotateSidebar();
    ensureWorkShortcut();
    labelSettingsTabs();
    installSettingsExplainer();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; install(); });
  }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class','style','aria-label'] });
})();
