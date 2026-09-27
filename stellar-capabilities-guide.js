(() => {
  'use strict';

  if (window.__stellarCapabilitiesGuideV6) return;
  window.__stellarCapabilitiesGuideV6 = true;

  const PUBLIC_GUIDE_ITEMS = [
    ['Chat', 'Ask Stellar to write, plan, explain, fix and organise daily work.'],
    ['StellarX', 'Use StellarX for advanced guided tasks, bigger projects, website and business workflows, with approval-first steps.'],
    ['Website help', 'Improve landing pages, support pages, SEO copy, layout and calls to action.'],
    ['Business help', 'Draft lead replies, follow-up messages, offers, sales copy and simple plans.'],
    ['Credits', 'Understand daily credits, wallet top-ups, custom credit amounts, Discord promos and giveaways.'],
    ['Support', 'Find the right help route for billing, refunds, account access, bugs, credits or Discord rewards.'],
    ['Settings', 'See what each control does before changing account, model, voice, privacy or app preferences.'],
    ['Safety & approvals', 'Bigger actions are explained first so users know what happens before anything important runs.'],
  ];

  const OWNER_GUIDE_ITEMS = [
    ['Owner controls', 'Private owner/admin/staff settings for approvals, escalation routing and internal configuration.'],
    ['Staff controls', 'Team-only operational views and private configuration stay hidden from normal users.'],
  ];

  const MODEL_PICKER_COPY = Object.freeze({
    spark: { icon: '⚡', name: 'Spark', detail: 'Fast answers, short drafts and quick fixes', badge: 'Free' },
    fabie: { icon: '⚡', name: 'Spark', detail: 'Fast answers, short drafts and quick fixes', badge: 'Free' },
    star: { icon: '✦', name: 'Star', detail: 'Balanced everyday work and problem solving', badge: 'Default' },
    smart: { icon: '✦', name: 'Star', detail: 'Balanced everyday work and problem solving', badge: 'Default' },
    stellarx: { icon: '✧', name: 'StellarX', detail: 'Advanced guided tasks, bigger projects, website and business workflows', badge: 'Public' },
    comet: { icon: '☄', name: 'Comet', detail: 'Deeper reasoning for bigger builds, reviews and planning', badge: 'Plus' },
    nova: { icon: '✺', name: 'Nova', detail: 'Highest power for complex builds and long-form project work', badge: 'Pro' },
    ultra: { icon: '✺', name: 'Nova', detail: 'Highest power for complex builds and long-form project work', badge: 'Pro' },
  });

  function isAppPage() {
    return /\/app(?:\.html)?\/?$/i.test(location.pathname) || Boolean(document.querySelector('.app'));
  }

  function safeText(selector) {
    try { return String(document.querySelector(selector)?.textContent || '').trim(); } catch (_) { return ''; }
  }

  function isPrivilegedViewer() {
    const email = safeText('#acct-email,[data-account-email],.account-email').toLowerCase();
    const body = document.body;
    const html = document.documentElement;
    return /deadlyfox10@gmail\.com/.test(email)
      || body?.classList?.contains('owner')
      || body?.classList?.contains('is-owner')
      || body?.classList?.contains('admin')
      || body?.classList?.contains('staff')
      || body?.dataset?.owner === 'true'
      || body?.dataset?.admin === 'true'
      || body?.dataset?.staff === 'true'
      || html?.dataset?.owner === 'true'
      || html?.dataset?.admin === 'true'
      || html?.dataset?.staff === 'true'
      || document.querySelector('[data-owner-only]:not([hidden]),.owner-tools:not([hidden]),#provider-models:not([hidden])') !== null;
  }

  function addStyles() {
    if (document.getElementById('stellar-capabilities-guide-style')) return;
    const style = document.createElement('style');
    style.id = 'stellar-capabilities-guide-style';
    style.textContent = `
      .stellar-capabilities-guide{
        width:min(780px,100%);
        margin:14px auto 0;
        padding:14px;
        border:1px solid rgba(185,176,255,.16);
        border-radius:20px;
        background:linear-gradient(180deg,rgba(185,176,255,.075),rgba(255,255,255,.022));
        box-shadow:0 18px 55px rgba(0,0,0,.18);
      }
      .stellar-capabilities-guide strong{display:block;color:#f6f7fb;font-size:14px;letter-spacing:-.02em;}
      .stellar-capabilities-guide p{margin:5px 0 12px;color:#aeb6c6;font-size:12px;line-height:1.5;}
      .stellar-capabilities-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;}
      .stellar-capability-card{min-width:0;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(12,14,22,.68);}
      .stellar-capability-card b{display:block;color:#f4f2ff;font-size:12px;margin-bottom:4px;}
      .stellar-capability-card span{display:block;color:#929baa;font-size:11px;line-height:1.38;}
      .stellar-capability-owner-card{border-color:rgba(242,216,121,.24);background:linear-gradient(180deg,rgba(242,216,121,.08),rgba(12,14,22,.68));}
      .stellar-capability-owner-card b{color:#f7e4a1;}
      #settings-modal .stellar-capabilities-guide{width:100%;margin:0 0 16px;background:linear-gradient(145deg,rgba(139,124,246,.16),rgba(255,255,255,.024));}
      #model-menu [data-model-choice],.model-menu [data-model-choice]{min-height:58px;}
      #model-menu [data-model-choice="stellarx"],.model-menu [data-model-choice="stellarx"]{position:relative;border-color:rgba(185,176,255,.26)!important;background:linear-gradient(135deg,rgba(139,124,246,.14),rgba(255,255,255,.035))!important;}
      #model-menu [data-model-choice="stellarx"] .model-symbol,.model-menu [data-model-choice="stellarx"] .model-symbol{color:#d9d2ff!important;filter:drop-shadow(0 0 12px rgba(185,176,255,.36));}
      #model-menu [data-model-choice="stellarx"] .model-access,.model-menu [data-model-choice="stellarx"] .model-access{color:#d9d2ff!important;border-color:rgba(185,176,255,.22)!important;background:rgba(185,176,255,.08)!important;}
      #model-menu [data-model-choice="nova"] .model-access,#model-menu [data-model-choice="ultra"] .model-access,.model-menu [data-model-choice="nova"] .model-access,.model-menu [data-model-choice="ultra"] .model-access{color:#f7e4a1!important;border-color:rgba(242,216,121,.24)!important;background:rgba(242,216,121,.08)!important;}
      @media(max-width:640px){.stellar-capabilities-guide{padding:12px;border-radius:18px}.stellar-capabilities-grid{grid-template-columns:1fr}.stellar-capability-card{padding:10px}#model-menu [data-model-choice],.model-menu [data-model-choice]{min-height:64px!important}}
    `;
    document.head.appendChild(style);
  }

  function appendCards(grid, items, ownerOnly = false) {
    items.forEach(([name, detail]) => {
      const card = document.createElement('article');
      card.className = ownerOnly ? 'stellar-capability-card stellar-capability-owner-card' : 'stellar-capability-card';
      if (ownerOnly) card.dataset.ownerCapability = 'true';
      const heading = document.createElement('b');
      heading.textContent = name;
      const copy = document.createElement('span');
      copy.textContent = detail;
      card.append(heading, copy);
      grid.appendChild(card);
    });
  }

  function guideNode(compact = false) {
    const privileged = isPrivilegedViewer();
    const section = document.createElement('section');
    section.className = 'stellar-capabilities-guide';
    section.dataset.stellarCapabilitiesGuide = 'true';
    section.setAttribute('aria-label', 'What Stellar AI can do');
    const title = document.createElement('strong');
    title.textContent = compact ? 'What Stellar can do' : 'What Stellar AI can do for you';
    const intro = document.createElement('p');
    intro.textContent = compact
      ? 'Use Stellar and StellarX for chat, advanced projects, websites, credits, support, business follow-up and clear approval steps.'
      : 'Stellar is not just a blank chat box. It helps users understand what to ask, what to click and when bigger actions need approval.';
    const grid = document.createElement('div');
    grid.className = 'stellar-capabilities-grid';
    appendCards(grid, PUBLIC_GUIDE_ITEMS, false);
    if (privileged) appendCards(grid, OWNER_GUIDE_ITEMS, true);
    section.append(title, intro, grid);
    return section;
  }

  function replaceGuide(existing, compact = false) {
    const next = guideNode(compact);
    existing.replaceWith(next);
    return next;
  }

  function installHomeGuide() {
    if (!isAppPage()) return;
    const existing = document.querySelector('.chat-inner > [data-stellar-capabilities-guide="true"],.home-welcome > [data-stellar-capabilities-guide="true"],.welcome > [data-stellar-capabilities-guide="true"]');
    if (existing) { replaceGuide(existing, false); return; }
    const anchor = document.querySelector('.app .quality-strip,.app .home-welcome,.app .welcome,.chat-inner');
    if (!anchor) return;
    const guide = guideNode(false);
    if (anchor.classList.contains('quality-strip')) anchor.insertAdjacentElement('afterend', guide);
    else anchor.appendChild(guide);
  }

  function installSettingsGuide() {
    const modal = document.querySelector('#settings-modal,.settings-panel,[data-settings-panel]');
    if (!modal) return;
    const existing = modal.querySelector('[data-stellar-capabilities-guide="true"]');
    if (existing) { replaceGuide(existing, true); return; }
    const panel = modal.querySelector('.set-panel:not([style*="display: none"]),.set-panel,.settings-card,.set-body') || modal;
    panel.prepend(guideNode(true));
  }

  function modelMenu() {
    return document.querySelector('#model-menu,.model-menu,[data-model-menu]');
  }

  function updateText(node, selector, value) {
    const target = node.querySelector(selector);
    if (target && target.textContent !== value) target.textContent = value;
  }

  function polishModelOption(option) {
    const key = String(option?.dataset?.modelChoice || '').trim().toLowerCase();
    const copy = MODEL_PICKER_COPY[key];
    if (!copy) return;
    option.dataset.publicModel = 'true';
    option.setAttribute('aria-label', `${copy.name}: ${copy.detail}. ${copy.badge}.`);
    updateText(option, '.model-symbol', copy.icon);
    updateText(option, '.model-copy strong,strong', copy.name);
    updateText(option, '.model-copy small,small', copy.detail);
    updateText(option, '.model-access', copy.badge);
  }

  function polishModelPickerOptions() {
    const menu = modelMenu();
    if (!menu) return;
    menu.querySelectorAll('[data-model-choice]').forEach(polishModelOption);
  }

  function refreshModelButtonLabel() {
    const button = document.querySelector('#model-btn,.model-pill,[data-model-button]');
    if (!button) return;
    const strong = button.querySelector('strong');
    if (strong) {
      strong.textContent = 'StellarX';
      return;
    }
    const label = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && /spark|star|comet|nova|stellarx/i.test(node.textContent || ''));
    if (label) label.textContent = ' StellarX ';
    else button.setAttribute('aria-label', 'StellarX model selected');
  }

  function markStellarXSelected(menu, button) {
    menu.querySelectorAll('[data-model-choice]').forEach((option) => option.setAttribute('aria-checked', option === button ? 'true' : 'false'));
    button.classList.add('active', 'selected');
    refreshModelButtonLabel();
  }

  function chooseStellarX(button) {
    try {
      if (typeof window.setModel === 'function') window.setModel('Comet', 'StellarX advanced guided tasks');
    } catch (_) {}
    window.setTimeout(() => {
      const menu = modelMenu();
      const nextButton = button || menu?.querySelector('[data-model-choice="stellarx"]');
      if (menu && nextButton) markStellarXSelected(menu, nextButton);
    }, 0);
  }

  function stellarXModelOption() {
    const button = document.createElement('button');
    button.className = 'model-option stellarx-model-option';
    button.type = 'button';
    button.setAttribute('role', 'menuitemradio');
    button.setAttribute('aria-checked', 'false');
    button.dataset.modelChoice = 'stellarx';
    button.dataset.publicModel = 'true';
    button.innerHTML = '<span class="model-symbol">✧</span><span class="model-copy"><strong>StellarX</strong><small>Advanced guided tasks, bigger projects, website and business workflows</small></span><span class="model-access">Public</span>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      chooseStellarX(button);
    });
    return button;
  }

  function installModelPickerOption() {
    if (!isAppPage()) return;
    const menu = modelMenu();
    if (!menu) return;
    const holder = menu.querySelector('.model-options') || menu;
    if (!menu.querySelector('[data-model-choice="stellarx"]')) {
      const option = stellarXModelOption();
      const before = holder.querySelector('[data-model-choice="comet"],[data-model-choice="nova"],[data-model-choice="ultra"]');
      if (before) before.insertAdjacentElement('beforebegin', option);
      else holder.appendChild(option);
    }
    polishModelPickerOptions();
  }

  function install() {
    if (!isAppPage()) return;
    addStyles();
    installHomeGuide();
    installSettingsGuide();
    installModelPickerOption();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; install(); });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-owner', 'data-admin', 'data-staff'] });
})();