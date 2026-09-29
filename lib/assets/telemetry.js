(() => {
  const endpoint = '/api/client-metric';
  const allowed = new Set([
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error'
  ]);

  const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';
  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';

  function safeGetStorage(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }

  function metricsAllowed() {
    return safeGetStorage(METRICS_OPTOUT_KEY) !== '1';
  }

  function getStatusNode() {
    return document.querySelector('.status,[data-status],#status,[role="status"]');
  }

  function setStatus(message, tone = '') {
    const status = getStatusNode();
    if (!status) return;
    status.textContent = message;
    status.classList?.remove?.('error', 'good', 'warn');
    if (tone) status.classList?.add?.(tone);
  }

  function isAppPage() {
    return location.pathname === '/app' || location.pathname === '/app.html' || !!document.querySelector('.app');
  }

  function injectBusinessPolish() {
    if (document.getElementById('stellar-business-polish-v8')) return;
    const style = document.createElement('style');
    style.id = 'stellar-business-polish-v8';
    style.textContent = `
      html,body{min-width:320px;max-width:100%;overflow-x:hidden;}
      body{touch-action:manipulation;-webkit-text-size-adjust:100%;}
      button,a,input,textarea,select{min-height:44px;}

      body.public-home .oa2-hero{padding-top:clamp(70px,10vw,126px)!important;padding-bottom:clamp(58px,8vw,96px)!important;}
      body.public-home .oa2-hero h1{max-width:900px!important;text-wrap:balance!important;}
      body.public-home .oa2-lead{max-width:720px!important;text-wrap:balance!important;}
      body.public-home .oa2-start-note{color:#b8bfcc!important;font-weight:760!important;}
      body.public-home .oa2-proof-row,body.public-home .oa2-starters,body.public-home .oa2-quicklinks{display:none!important;}
      body.public-home .oa2-hero-proof{gap:8px!important;}
      body.public-home .oa2-hero-proof span{background:rgba(17,20,30,.82)!important;border-color:rgba(185,176,255,.16)!important;}
      body.public-home .pricing-trust span{white-space:nowrap!important;}
      body.public-home .credit-wallet-packs{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(124px,1fr))!important;gap:8px!important;}
      body.public-home .credit-wallet-packs a{min-height:84px!important;display:grid!important;place-items:center!important;align-content:center!important;gap:2px!important;padding:12px!important;text-align:center!important;border-radius:16px!important;}
      body.public-home .credit-wallet-packs a span{font-weight:900!important;color:#f6f7fb!important;}
      body.public-home .credit-wallet-packs a span::after{content:' ·';color:#8f96a5!important;font-weight:800!important;}
      body.public-home .credit-wallet-packs a strong{font-size:13px!important;line-height:1.1!important;}
      body.public-home .credit-wallet-packs a small{font-size:11px!important;color:#a9a2ff!important;}
      body.public-home .final-cta{padding-bottom:clamp(58px,8vw,96px)!important;}

      .app .quick{display:none!important;}
      .app .quality-strip{max-width:620px!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;}
      .app .welcome,.app .home-welcome{padding-top:clamp(32px,7vh,76px)!important;padding-bottom:18px!important;}
      .app .welcome h1,.app .home-welcome h1{font-size:clamp(38px,8vw,76px)!important;line-height:1.02!important;letter-spacing:-.065em!important;text-wrap:balance!important;}
      .app .welcome p,.app .space-home-subtitle{max-width:680px!important;color:#b8c0cf!important;}
      .app .composer-wrap{position:sticky!important;bottom:0!important;z-index:30!important;padding-bottom:calc(12px + env(safe-area-inset-bottom))!important;}
      .app .composer{max-width:min(860px,100%)!important;border-radius:22px!important;}
      .app .composer-bar{grid-template-columns:minmax(0,1fr) auto auto auto!important;}
      .app textarea{font-size:16px!important;}
      .app .side{scrollbar-width:thin;}
      .app .nav-link,.app .set-item{min-height:44px!important;align-items:center!important;}
      .app .chat-history-item{display:flex!important;gap:8px!important;align-items:center!important;}
      .app .chat-title{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}
      .model-menu,.model-list,.model-picker,.model-options,[data-model-menu],[data-model-picker]{max-height:min(70dvh,520px)!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;}
      .settings-modal,.settings-panel,.settings-card,.modal-card,[data-settings-panel]{max-height:90dvh!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;}
      .plans,.pricing-grid,.plan-grid{align-items:stretch!important;}
      .plans .plan,.plan-card,.price-card{min-width:0!important;overflow:hidden!important;}
      .plans .plan .btn,.plan-card .btn,.price-card .btn{width:100%;}
      .support-card,.billing-card,.account-card{overflow-wrap:anywhere;}
      [data-owner-only="true"],.owner-only[hidden]{display:none!important;}
      .stop-btn[hidden],.stop-btn.is-idle{display:none!important;}

      .app .top-usage,.stellar-credit-pill{min-height:38px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;padding:0 12px!important;border:1px solid rgba(185,176,255,.20)!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(139,124,246,.14),rgba(17,20,30,.88))!important;color:#f4f1ff!important;font-size:12px!important;font-weight:850!important;letter-spacing:-.01em!important;box-shadow:0 12px 36px rgba(139,124,246,.10)!important;white-space:nowrap!important;}
      .stellar-credit-pill::before,.app .top-usage.stellar-credit-pill::before{content:'✦';width:18px;height:18px;display:inline-grid;place-items:center;border-radius:999px;background:rgba(255,255,255,.08);color:#b9b0ff;font-size:13px;line-height:1;border:1px solid rgba(185,176,255,.22);box-shadow:0 0 18px rgba(185,176,255,.18);}
      .stellar-credit-pill small{color:#b9b0ff;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.08em;}
      .stellar-account-credit-card{margin:10px 0!important;padding:14px!important;border:1px solid rgba(185,176,255,.18)!important;border-radius:16px!important;background:linear-gradient(135deg,rgba(139,124,246,.12),rgba(17,20,30,.86))!important;color:#f5f2ff!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;box-shadow:0 14px 44px rgba(0,0,0,.18)!important;}
      .stellar-account-credit-card .credit-token{width:30px;height:30px;display:grid;place-items:center;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(185,176,255,.24);color:#b9b0ff;box-shadow:0 0 24px rgba(185,176,255,.20);font-weight:900;}
      .stellar-account-credit-card strong{display:block;font-size:13px;line-height:1.1;letter-spacing:-.02em;}
      .stellar-account-credit-card span[data-account-credit-value]{display:block;margin-top:3px;color:#d9d4ff;font-size:12px;font-weight:760;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .stellar-account-credit-card small{display:block;margin-top:3px;color:#8f98a8;font-size:10px;font-weight:720;}
      .stellar-account-credit-card button{min-height:34px!important;padding:0 10px!important;border:1px solid rgba(185,176,255,.24)!important;border-radius:999px!important;background:rgba(255,255,255,.055)!important;color:#f4f1ff!important;font-size:11px!important;font-weight:850!important;}
      .credit-option{border-color:rgba(185,176,255,.22)!important;background:rgba(139,124,246,.06)!important;}
      .credit-option::before{content:'✦';width:16px;height:16px;display:inline-grid;place-items:center;border-radius:999px;background:rgba(185,176,255,.10);color:#b9b0ff;font-size:11px;border:1px solid rgba(185,176,255,.18);}
      [data-admin-credit],[data-owner-credit],.owner-credit-panel{display:none!important;}

      .drawer-backdrop[hidden],.modal-backdrop[hidden],.settings-backdrop[hidden],[data-backdrop][hidden]{display:none!important;pointer-events:none!important;}
      .drawer-backdrop:not([hidden]),.modal-backdrop:not([hidden]),.settings-backdrop:not([hidden]),[data-backdrop]:not([hidden]){pointer-events:auto;}
      body:not(.drawer-open) .drawer-backdrop{display:none!important;pointer-events:none!important;}
      body.settings-open .app .side,body.modal-open .app .side{pointer-events:none;}
      body.settings-open .settings-modal,body.settings-open [data-settings-panel],body.modal-open .modal-card,body.modal-open .settings-modal{pointer-events:auto;}

      .app .side button,.app .side a{min-width:44px;}
      .app .chat-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
      .app .chat-actions .nav-link{justify-content:center!important;text-align:center!important;}
      .app .chat-history-item [aria-label*="Pin"],.app .chat-history-item [aria-label*="Delete"],.app .chat-history-item [aria-label*="Remove"],
      .app .chat-history-item .pin-chat,.app .chat-history-item .delete-chat{min-width:36px!important;width:36px!important;height:36px!important;border-radius:10px!important;}

      @media(max-width:980px){body.public-home .credit-wallet-packs{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
      @media(max-width:780px){
        .app{display:block!important;}
        .app .top{padding-inline:10px!important;gap:8px!important;}
        .app .top-left,.app .top-actions{gap:6px!important;}
        .app .top-usage,.stellar-credit-pill{display:inline-flex!important;max-width:132px!important;min-height:36px!important;padding:0 10px!important;font-size:11px!important;overflow:hidden!important;text-overflow:ellipsis!important;}
        .app .model-pill{max-width:126px!important;overflow:hidden!important;text-overflow:ellipsis!important;}
        .app .side{position:fixed!important;inset:0 auto 0 0!important;width:min(84vw,320px)!important;transform:translateX(-105%);transition:transform .22s cubic-bezier(.2,.8,.2,1);z-index:80!important;}
        body.drawer-open .app .side,.app .side.is-open,.app .side.open{transform:translateX(0)!important;}
        .drawer-backdrop{position:fixed!important;inset:0!important;background:rgba(0,0,0,.48)!important;z-index:70!important;}
        body.drawer-open .drawer-backdrop{display:block!important;}
        .mobile-menu,.side-close{display:grid!important;place-items:center!important;min-width:44px!important;min-height:44px!important;pointer-events:auto!important;position:relative!important;z-index:95!important;}
        .app .chat{padding:14px 12px 12px!important;}
        .app .composer-wrap{padding:10px 10px calc(10px + env(safe-area-inset-bottom))!important;}
        .app .composer{padding:9px!important;border-radius:20px!important;}
        .app .composer-tools{gap:6px!important;overflow:auto!important;flex-wrap:nowrap!important;padding-bottom:8px!important;}
        .app .composer-tool,.app .credit-option{flex:0 0 auto!important;}
        .app .composer-bar{grid-template-columns:minmax(0,1fr) auto!important;}
        .app .composer-bar .btn:not(.primary){display:none!important;}
        .app .quality-strip{grid-template-columns:1fr!important;gap:7px!important;}
        .app .quality-strip span{border-radius:14px!important;}
        .settings-modal,.settings-panel,.settings-card,.modal-card,[data-settings-panel]{position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;top:auto!important;width:auto!important;max-width:none!important;max-height:90dvh!important;border-radius:22px 22px calc(22px + env(safe-area-inset-bottom)) calc(22px + env(safe-area-inset-bottom))!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important;}
        .model-menu,.model-list,.model-picker,.model-options,[data-model-menu],[data-model-picker]{position:fixed!important;left:10px!important;right:10px!important;top:72px!important;width:auto!important;max-width:none!important;}
        .stellar-account-credit-card{grid-template-columns:auto minmax(0,1fr)!important;}
        .stellar-account-credit-card button{grid-column:1 / -1!important;width:100%!important;}
      }
      @media(max-width:420px){
        .app .welcome h1,.app .home-welcome h1{font-size:clamp(34px,12vw,48px)!important;}
        .app .status{font-size:11px!important;}
        .app .btn.primary{padding-inline:12px!important;}
        .app .top-usage,.stellar-credit-pill{max-width:112px!important;}
        body.public-home .credit-wallet-packs{grid-template-columns:1fr!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function replaceVisibleCreditCopy(root = document.body) {
    const map = new Map([
      ['Add-on credits stay separate', 'Wallet top-ups stay separate'],
      ['Wallet separate from allowance', 'Wallet separate from monthly allowance']
    ]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      map.forEach((to, from) => { text = text.split(from).join(to); });
      if (text !== node.nodeValue) node.nodeValue = text;
    });
  }

  function makePackLink(credits, price, amount, bonus, popular = false) {
    const link = document.createElement('a');
    link.href = `/app?credits=${credits}`;
    link.dataset.telemetryPolished = 'true';
    if (popular) link.className = 'wallet-popular';
    link.setAttribute('aria-label', `${price} top-up for ${amount}${bonus ? ', ' + bonus : ''}`);
    link.innerHTML = `<span>${price}</span><strong>${amount}</strong><small>${bonus || 'starter pack'}</small>`;
    return link;
  }

  function normaliseCreditText(text) {
    const raw = String(text || '').replace(/[💳✦✧✶]/g, '').trim();
    if (!raw || /loading/i.test(raw)) return 'Credits ready';
    return raw.replace(/credits available/i, 'credits ready');
  }

  function getCreditDisplayText() {
    const pill = document.getElementById('top-usage') || document.querySelector('.top-usage,[data-credit-pill]');
    const pillText = normaliseCreditText(pill?.textContent || '');
    if (pillText && !/loading/i.test(pillText)) return pillText;
    const creditTextNode = Array.from(document.querySelectorAll('.plan-usage-pill,.credit-note,.credit-option,[data-credits],[data-credit-value]'))
      .find(node => /credit/i.test(node.textContent || node.getAttribute?.('data-credit-value') || ''));
    return normaliseCreditText(creditTextNode?.textContent || creditTextNode?.getAttribute?.('data-credit-value') || 'Credits ready');
  }

  function openCreditsPanel() {
    const billing = document.querySelector('[data-open-billing],#billing-btn,a[href*="billing"],a[href*="upgrade"],a[href*="credits"]');
    if (billing instanceof HTMLElement) billing.click();
    else location.href = '/app?credits=1000';
  }

  function ensureCreditIcon() {
    if (!isAppPage()) return;
    let pill = document.getElementById('top-usage') || document.querySelector('.top-usage,[data-credit-pill]');
    const mount = document.querySelector('.app .top-actions,.app .top-left,.top-actions,.top-left');
    if (!pill && mount) {
      pill = document.createElement('button');
      pill.type = 'button';
      pill.id = 'top-usage';
      pill.className = 'top-usage stellar-credit-pill';
      pill.dataset.creditPill = 'true';
      pill.dataset.creditIcon = 'sparkle-token';
      pill.textContent = 'Credits ready';
      pill.addEventListener('click', openCreditsPanel);
      mount.appendChild(pill);
    }
    if (!pill) return;
    pill.classList.add('stellar-credit-pill');
    pill.dataset.creditPill = 'true';
    pill.dataset.creditIcon = 'sparkle-token';
    const clean = normaliseCreditText(pill.textContent);
    if (pill.textContent !== clean) pill.textContent = clean;
    pill.setAttribute('aria-label', `Credits: ${clean}. Free resets daily at midnight UK time; paid plan credits reset monthly; wallet top-ups stay separate.`);
    pill.setAttribute('title', 'Credits: included allowance plus wallet top-ups');
  }

  function ensureAccountCreditCard() {
    if (!isAppPage()) return;
    const creditText = getCreditDisplayText();
    const panels = Array.from(document.querySelectorAll('[data-settings-panel],.settings-modal,.settings-panel,.settings-card,.account-card,.billing-card,#account-menu,#account-panel'));
    if (!panels.length && !document.body.classList.contains('settings-open') && !document.body.classList.contains('modal-open')) return;
    const targets = panels.length ? panels : Array.from(document.querySelectorAll('.modal-card,[role="dialog"]'));
    targets.forEach(panel => {
      if (!(panel instanceof HTMLElement)) return;
      if (panel.closest('[hidden]') || panel.hidden) return;
      let card = panel.querySelector(':scope > .stellar-account-credit-card');
      if (!card) {
        card = document.createElement('section');
        card.className = 'stellar-account-credit-card';
        card.dataset.accountCredits = 'true';
        card.innerHTML = `<div class="credit-token" aria-hidden="true">✦</div><div><strong>Credits</strong><span data-account-credit-value>Credits ready</span><small>Updates when your plan or wallet credits refresh.</small></div><button type="button" data-credit-topup>Top up</button>`;
        const afterHeader = panel.querySelector('.settings-header,.account-header,.billing-header,h2,h3');
        if (afterHeader?.parentElement === panel) afterHeader.insertAdjacentElement('afterend', card);
        else panel.prepend(card);
        card.querySelector('[data-credit-topup]')?.addEventListener('click', openCreditsPanel);
      }
      const value = card.querySelector('[data-account-credit-value]');
      if (value && value.textContent !== creditText) value.textContent = creditText;
      card.setAttribute('aria-label', `Account credits: ${creditText}`);
    });
  }

  function tidyLandingPage() {
    if (!document.body.classList.contains('public-home')) return;
    const hero = document.querySelector('.oa2-hero');
    if (hero) {
      const title = document.getElementById('hero-title');
      if (title && /AI for real work|Ask anything/i.test(title.textContent || '')) title.textContent = 'Your daily AI workspace.';
      const lead = hero.querySelector('.oa2-lead');
      if (lead) lead.textContent = 'Ask, plan, write, fix your website, reply to leads and hand bigger jobs to StellarX — all from one clean workspace.';
      const startNote = hero.querySelector('.oa2-start-note');
      if (startNote) startNote.textContent = 'Free to start · 75 credits/day · midnight UK reset · no card required';
      const proof = hero.querySelector('.oa2-hero-proof');
      if (proof && !proof.dataset.telemetryPolished) {
        proof.dataset.telemetryPolished = 'true';
        proof.replaceChildren(...['Chat', '300/day Free', 'Website help', 'Lead follow-up', 'Safe approvals'].map(label => {
          const chip = document.createElement('span');
          chip.textContent = label;
          return chip;
        }));
      }
    }

    replaceVisibleCreditCopy();

    const wallet = document.querySelector('.credit-wallet-packs');
    if (wallet && !wallet.querySelector('a[href="/app?credits=300"]')) {
      wallet.prepend(makePackLink('500', '£5', '525 credits', '+5% bonus'));
      wallet.prepend(makePackLink('300', '£3', '300 credits', 'small top-up'));
    }

    const packs = [
      ['300', '£3', '300 credits', 'small top-up'],
      ['500', '£5', '525 credits', '+5% bonus'],
      ['1000', '£10', '1,100 credits', '+10% bonus'],
      ['2500', '£25', '2,875 credits', '+15% bonus'],
      ['5000', '£50', '6,000 credits', '+20% bonus', true],
      ['10000', '£100', '12,000 credits', '+20% bonus'],
      ['20000', '£200', '24,000 credits', '+20% bonus']
    ];
    packs.forEach(([credits, price, amount, bonus, popular]) => {
      const link = document.querySelector(`a[href="/app?credits=${credits}"]`);
      if (!link || link.dataset.telemetryPolished === 'true') return;
      link.dataset.telemetryPolished = 'true';
      if (popular) link.classList.add('wallet-popular');
      link.setAttribute('aria-label', `${price} top-up for ${amount}, ${bonus}`);
      link.innerHTML = `<span>${price}</span><strong>${amount}</strong><small>${bonus}</small>`;
    });
  }

  function tidyWorkspaceCopy() {
    if (!isAppPage()) return;
    replaceVisibleCreditCopy();
    ensureCreditIcon();
    ensureAccountCreditCard();
    ensureMobileDrawerControls();
    const usage = document.getElementById('top-usage');
    setTimeout(() => {
      if (usage && /loading/i.test(usage.textContent || '')) {
        usage.textContent = 'Credits ready';
        ensureCreditIcon();
        ensureAccountCreditCard();
      }
    }, 1800);

    const syncIdleStop = () => {
      const status = getStatusNode();
      const text = String(status?.textContent || '').trim().toLowerCase();
      document.querySelectorAll('.stop-btn').forEach(button => {
        const idle = !text || /^(ready|signed in|signed out|chat opened|account ready|monthly credits ready|credits ready)$/i.test(text);
        button.classList.toggle('is-idle', idle);
        if (idle) button.setAttribute('aria-hidden', 'true'); else button.removeAttribute('aria-hidden');
      });
    };
    syncIdleStop();
    const status = getStatusNode();
    if (status) new MutationObserver(syncIdleStop).observe(status, { childList: true, characterData: true, subtree: true });

    let creditRefreshQueued = false;
    const queueCreditRefresh = () => {
      if (creditRefreshQueued) return;
      creditRefreshQueued = true;
      requestAnimationFrame(() => {
        creditRefreshQueued = false;
        replaceVisibleCreditCopy();
        ensureCreditIcon();
        ensureAccountCreditCard();
        ensureMobileDrawerControls();
      });
    };
    // Keep the polish helper narrow. Watching the entire app subtree caused
    // needless work on every streamed chat token and could fight primary UI state.
    if (usage) {
      new MutationObserver(queueCreditRefresh).observe(usage, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
      new MutationObserver(queueCreditRefresh).observe(settingsPanel, {
        attributes: true,
        attributeFilter: ['hidden', 'style', 'aria-hidden'],
      });
    }
  }

  function getSidebar() {
    return document.querySelector('.app .side,#sidebar,.side');
  }

  function getDrawerBackdrop() {
    let backdrop = document.querySelector('.drawer-backdrop');
    if (!backdrop && isAppPage()) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'drawer-backdrop';
      backdrop.hidden = true;
      backdrop.setAttribute('aria-label', 'Close menu');
      backdrop.dataset.closeDrawer = 'true';
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  function openDrawer() {
    const sidebar = getSidebar();
    if (!sidebar) return;
    document.body.classList.add('drawer-open');
    sidebar.classList.add('is-open', 'open');
    sidebar.removeAttribute('aria-hidden');
    const backdrop = getDrawerBackdrop();
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.inert = false;
      backdrop.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('open');
      backdrop.style.display = '';
    }
  }

  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    const sidebar = getSidebar();
    sidebar?.classList?.remove?.('is-open', 'open');
    const backdrop = document.querySelector('.drawer-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.inert = true;
      backdrop.hidden = true;
      backdrop.style.display = '';
    }
  }

  function ensureMobileDrawerControls() {
    if (!isAppPage()) return;
    const topLeft = document.querySelector('.app .top-left,.top-left,.app .top');
    const sidebar = getSidebar();

    const nativeOpen = document.querySelector('.mobile-menu:not([data-stellar-mobile-menu="true"])');
    const injectedOpen = Array.from(document.querySelectorAll('.mobile-menu[data-stellar-mobile-menu="true"]'));
    if (nativeOpen) {
      injectedOpen.forEach((button) => button.remove());
      if (!nativeOpen.getAttribute('aria-label')) nativeOpen.setAttribute('aria-label', 'Open menu');
      if (!nativeOpen.getAttribute('title')) nativeOpen.setAttribute('title', 'Open menu');
    } else if (topLeft && sidebar && injectedOpen.length === 0) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'icon-btn mobile-menu';
      button.dataset.stellarMobileMenu = 'true';
      button.setAttribute('aria-label', 'Open menu');
      button.setAttribute('title', 'Open menu');
      button.innerHTML = '<span aria-hidden="true">☰</span>';
      topLeft.prepend(button);
    } else if (injectedOpen.length > 1) {
      injectedOpen.slice(1).forEach((button) => button.remove());
    }

    const nativeClose = sidebar?.querySelector('.side-close:not([data-stellar-side-close="true"])');
    const injectedClose = sidebar ? Array.from(sidebar.querySelectorAll('.side-close[data-stellar-side-close="true"]')) : [];
    if (nativeClose) {
      injectedClose.forEach((button) => button.remove());
      if (!nativeClose.getAttribute('aria-label')) nativeClose.setAttribute('aria-label', 'Close menu');
      if (!nativeClose.getAttribute('title')) nativeClose.setAttribute('title', 'Close menu');
    } else if (sidebar && injectedClose.length === 0) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'icon-btn side-close';
      close.dataset.stellarSideClose = 'true';
      close.setAttribute('aria-label', 'Close menu');
      close.setAttribute('title', 'Close menu');
      close.innerHTML = '<span aria-hidden="true">×</span>';
      const brandRow = sidebar.querySelector('.brand-row');
      if (brandRow) brandRow.appendChild(close);
      else sidebar.prepend(close);
    } else if (injectedClose.length > 1) {
      injectedClose.slice(1).forEach((button) => button.remove());
    }

    getDrawerBackdrop();
  }

  function rescueInteractionState(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openControl = target.closest('.mobile-menu,[data-open-drawer],[aria-label*="Open menu"]');
    if (openControl) {
      // The app has authoritative native drawer handlers. Do not capture or
      // cancel their clicks; the rescue path is only for fallback controls that
      // this helper had to inject on older pages.
      if (!openControl.matches('[data-stellar-mobile-menu="true"],[data-open-drawer]')) return;
      event.preventDefault();
      event.stopPropagation();
      openDrawer();
      return;
    }

    const closeControl = target.closest('.drawer-backdrop,[data-close-drawer],.side-close,[aria-label*="Close menu"]');
    if (closeControl) {
      const isInjectedFallback = closeControl.matches('[data-stellar-side-close="true"],[data-close-drawer]');
      const isNativeBackdrop = closeControl.id === 'backdrop';
      if (!isInjectedFallback || isNativeBackdrop) return;
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
      return;
    }

    const sidebarLink = target.closest('.app .side a,.app .side button.nav-link,#sidebar a,#sidebar button.nav-link');
    if (sidebarLink && !target.closest('.side-close') && matchMedia('(max-width: 780px)').matches) {
      setTimeout(closeDrawer, 80);
    }

    const opensSettings = target.closest('[data-open-settings],#settings-btn,[aria-label*="Settings"],button');
    const label = `${opensSettings?.textContent || ''} ${opensSettings?.getAttribute?.('aria-label') || ''}`.toLowerCase();
    if (opensSettings && /settings/.test(label)) {
      document.body.classList.remove('drawer-open');
    }

    const dialog = target.closest('.settings-modal,.modal-card,[role="dialog"],[data-settings-panel]');
    if (!dialog) return;
    const close = target.closest('.modal-x,.topup-close,[data-close-modal],button[aria-label^="Close"]');
    if (!close) return;
    setTimeout(() => {
      document.body.classList.remove('modal-open', 'settings-open', 'auth-open');
      document.querySelectorAll('[data-backdrop],.modal-backdrop,.settings-backdrop').forEach(backdrop => {
        if (backdrop instanceof HTMLElement && backdrop.hidden) backdrop.style.display = 'none';
      });
    }, 40);
  }

  function supportFallback(event) {
    const target = event.target?.closest?.('a,button,[role="button"]');
    if (!target) return;
    const text = `${target.textContent || ''} ${target.getAttribute('aria-label') || ''} ${target.getAttribute('href') || ''}`.toLowerCase();
    if (!/(support|account help|refund|copy email|contact|billing help)/.test(text)) return;

    if (/copy email|support email/.test(text)) {
      event.preventDefault();
      const copied = navigator.clipboard?.writeText(SUPPORT_EMAIL);
      copied?.then?.(() => setStatus(`Support email copied: ${SUPPORT_EMAIL}`, 'good')).catch?.(() => setStatus(SUPPORT_EMAIL, 'warn'));
      if (!copied) setStatus(SUPPORT_EMAIL, 'warn');
      return;
    }

    if (target.tagName === 'A' && target.getAttribute('href')) return;
    event.preventDefault();
    location.href = `mailto:${SUPPORT_EMAIL}?subject=Stellar%20AI%20support`;
  }

  function preventPinnedDelete(event) {
    const target = event.target?.closest?.('button,a,[role="button"]');
    if (!target) return;
    const text = `${target.textContent || ''} ${target.getAttribute('aria-label') || ''} ${target.getAttribute('title') || ''}`.toLowerCase();
    if (!/(delete|remove|trash)/.test(text)) return;
    const row = target.closest?.('.chat-history-item,[data-chat-row],li');
    if (!row) return;

    let pinnedByAttribute = false;
    try { pinnedByAttribute = row.matches?.('[data-pinned="true"],[aria-pressed="true"].pinned') || false; } catch {}
    const pinned = pinnedByAttribute
      || /pinned|📌|pin-mark/.test(row.textContent || '')
      || !!row.querySelector?.('.pin-mark,[data-pin-state="pinned"],[aria-label*="Pinned"],[title*="Pinned"]');

    if (!pinned) return;
    event.preventDefault();
    event.stopPropagation();
    setStatus('Pinned chats are protected. Unpin first before deleting.', 'warn');
  }

  function track(event) {
    if (!metricsAllowed()) return false;
    const name = String(event || '').trim().toLowerCase();
    if (!allowed.has(name)) return false;
    const body = JSON.stringify({ event: name });
    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
        if (ok) return true;
      }
    } catch {}
    try {
      fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true, credentials: 'same-origin' }).catch(() => {});
      return true;
    } catch { return false; }
  }

  const cleanApp = document.body?.dataset?.stellarCleanApp === 'true';
  if (!cleanApp) {
    injectBusinessPolish();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { tidyLandingPage(); tidyWorkspaceCopy(); ensureMobileDrawerControls(); }, { once: true });
    } else {
      tidyLandingPage();
      tidyWorkspaceCopy();
      ensureMobileDrawerControls();
    }
  }

  window.StellarTelemetry = Object.freeze({ track });
  if (location.pathname === '/' || location.pathname === '/index.html') track('landing-view');
  if (location.pathname === '/app' || location.pathname === '/app.html') track('app-view');

  if (!cleanApp) {
    document.addEventListener('click', supportFallback, true);
    document.addEventListener('click', preventPinnedDelete, true);
    document.addEventListener('click', rescueInteractionState, true);
    document.addEventListener('touchend', rescueInteractionState, { capture: true, passive: false });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    });
  }

  document.addEventListener('click', (event) => {
    const link = event.target?.closest?.('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.hostname === 'buy.stripe.com' || url.hostname === 'checkout.stripe.com') {
      track('checkout-open');
      return;
    }
    if (url.origin !== location.origin) return;
    if (url.pathname === '/app' || url.pathname === '/app.html') track(url.searchParams.has('upgrade') ? 'upgrade-intent' : 'app-open-cta');
  }, { passive: true });

  addEventListener('error', () => track('client-error'));
  addEventListener('unhandledrejection', () => track('client-error'));
})();