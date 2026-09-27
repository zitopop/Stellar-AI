(() => {
  'use strict';

  if (window.__stellarCapabilitiesGuideV1) return;
  window.__stellarCapabilitiesGuideV1 = true;

  const GUIDE_ITEMS = [
    ['Chat', 'Ask Stellar to write, plan, explain, fix and organise daily work.'],
    ['Website help', 'Improve landing pages, support pages, SEO copy, layout and calls to action.'],
    ['Business help', 'Draft lead replies, follow-up messages, offers, sales copy and simple plans.'],
    ['Credits', 'Understand daily credits, wallet top-ups, custom credit amounts, Discord promos and giveaways.'],
    ['Support', 'Find the right help route for billing, refunds, account access, bugs, credits or Discord rewards.'],
    ['Settings', 'See what each control does before changing account, model, voice, privacy or app preferences.'],
    ['Owner tools', 'Keep Jarvis, Computer access, Roblox Studio help and bigger actions approval-first and owner-only.'],
  ];

  function isAppPage() {
    return /\/app(?:\.html)?\/?$/i.test(location.pathname) || Boolean(document.querySelector('.app'));
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
      #settings-modal .stellar-capabilities-guide{width:100%;margin:0 0 16px;background:linear-gradient(145deg,rgba(139,124,246,.16),rgba(255,255,255,.024));}
      @media(max-width:640px){.stellar-capabilities-guide{padding:12px;border-radius:18px}.stellar-capabilities-grid{grid-template-columns:1fr}.stellar-capability-card{padding:10px}}
    `;
    document.head.appendChild(style);
  }

  function guideNode(compact = false) {
    const section = document.createElement('section');
    section.className = 'stellar-capabilities-guide';
    section.dataset.stellarCapabilitiesGuide = 'true';
    section.setAttribute('aria-label', 'What Stellar AI can do');
    const title = document.createElement('strong');
    title.textContent = compact ? 'What Stellar can do' : 'What Stellar AI can do for you';
    const intro = document.createElement('p');
    intro.textContent = compact
      ? 'Use Stellar as a daily helper for chat, websites, credits, support, business follow-up and approval-first owner tools.'
      : 'Stellar is not just a blank chat box. It helps users understand what to ask, what to click and when bigger actions need approval.';
    const grid = document.createElement('div');
    grid.className = 'stellar-capabilities-grid';
    GUIDE_ITEMS.forEach(([name, detail]) => {
      const card = document.createElement('article');
      card.className = 'stellar-capability-card';
      const heading = document.createElement('b');
      heading.textContent = name;
      const copy = document.createElement('span');
      copy.textContent = detail;
      card.append(heading, copy);
      grid.appendChild(card);
    });
    section.append(title, intro, grid);
    return section;
  }

  function installHomeGuide() {
    if (!isAppPage() || document.querySelector('[data-stellar-capabilities-guide="true"]')) return;
    const anchor = document.querySelector('.app .quality-strip,.app .home-welcome,.app .welcome,.chat-inner');
    if (!anchor) return;
    const guide = guideNode(false);
    if (anchor.classList.contains('quality-strip')) anchor.insertAdjacentElement('afterend', guide);
    else anchor.appendChild(guide);
  }

  function installSettingsGuide() {
    const modal = document.querySelector('#settings-modal,.settings-panel,[data-settings-panel]');
    if (!modal || modal.querySelector('[data-stellar-capabilities-guide="true"]')) return;
    const panel = modal.querySelector('.set-panel:not([style*="display: none"]),.set-panel,.settings-card,.set-body') || modal;
    panel.prepend(guideNode(true));
  }

  function install() {
    if (!isAppPage()) return;
    addStyles();
    installHomeGuide();
    installSettingsGuide();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; install(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
