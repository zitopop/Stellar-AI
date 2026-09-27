(() => {
  const endpoint = '/api/client-metric';
  const allowed = new Set([
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error'
  ]);

  const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';
  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';
  const STREAK_KEY = 'stellar_daily_streak_v1';

  function safeGetStorage(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }

  function safeSetStorage(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }

  function metricsAllowed() {
    return safeGetStorage(METRICS_OPTOUT_KEY) !== '1';
  }

  function isAppPage() {
    return location.pathname === '/app' || location.pathname === '/app.html' || !!document.querySelector('.app');
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

  function injectBusinessPolish() {
    if (document.getElementById('stellar-business-polish-v6')) return;
    const style = document.createElement('style');
    style.id = 'stellar-business-polish-v6';
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
      .stop-btn[hidden],.stop-btn.is-idle{display:none!important;}
      .app .top-usage,.stellar-credit-pill{min-height:38px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;padding:0 12px!important;border:1px solid rgba(185,176,255,.20)!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(139,124,246,.16),rgba(17,20,30,.86))!important;color:#f4f1ff!important;font-size:12px!important;font-weight:850!important;letter-spacing:-.01em!important;box-shadow:0 12px 36px rgba(139,124,246,.10)!important;white-space:nowrap!important;}
      .stellar-credit-pill::before,.app .top-usage.stellar-credit-pill::before{content:'💳';font-size:15px;line-height:1;filter:drop-shadow(0 0 10px rgba(185,176,255,.24));}
      .credit-option{border-color:rgba(185,176,255,.22)!important;background:rgba(139,124,246,.06)!important;}
      .credit-option::before{content:'💳';font-size:13px;}
      [data-admin-credit],[data-owner-credit],.owner-credit-panel{display:none!important;}
      .settings-modal,.settings-panel,.settings-card,.modal-card,[data-settings-panel]{max-height:90dvh!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior:contain!important;background:linear-gradient(180deg,rgba(22,24,34,.98),rgba(10,12,18,.98))!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:28px!important;box-shadow:0 34px 110px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.08)!important;color:#f7f8fb!important;}
      .settings-modal h1,.settings-modal h2,.settings-modal h3,.settings-panel h1,.settings-panel h2,.settings-panel h3,[data-settings-panel] h1,[data-settings-panel] h2,[data-settings-panel] h3{letter-spacing:-.04em!important;color:#fff!important;}
      .stellar-settings-shell{padding:0!important;}
      .stellar-settings-hero{position:sticky;top:0;z-index:5;margin:-1px -1px 14px;padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,.09);background:linear-gradient(135deg,rgba(139,124,246,.20),rgba(16,163,127,.10) 46%,rgba(10,12,18,.96));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
      .stellar-settings-hero strong{display:block;font-size:22px;line-height:1.05;letter-spacing:-.055em;color:#fff;}
      .stellar-settings-hero p{margin:6px 0 12px;color:#b7bfce;font-size:13px;line-height:1.45;}
      .stellar-settings-chips{display:flex;gap:7px;flex-wrap:wrap;}
      .stellar-settings-chips span{min-height:28px;display:inline-flex;align-items:center;padding:0 9px;border:1px solid rgba(185,176,255,.20);border-radius:999px;background:rgba(255,255,255,.055);color:#dfe2ff;font-size:11px;font-weight:850;}
      .stellar-reward-card,.stellar-settings-needs{margin:12px 16px;padding:14px;border:1px solid rgba(185,176,255,.18);border-radius:18px;background:linear-gradient(135deg,rgba(139,124,246,.12),rgba(255,255,255,.035));}
      .stellar-reward-card strong,.stellar-settings-needs strong{display:block;margin-bottom:4px;color:#fff;font-size:13px;letter-spacing:-.02em;}
      .stellar-reward-card p,.stellar-settings-needs p{margin:0;color:#aeb7c7;font-size:12px;line-height:1.45;}
      .stellar-settings-needs ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0 0;padding:0;list-style:none;}
      .stellar-settings-needs li{min-height:38px;display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.035);color:#d8deeb;font-size:11px;font-weight:760;}
      .stellar-settings-needs li::before{content:'✓';display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:rgba(82,214,159,.15);color:#52d69f;font-size:10px;font-weight:900;}
      .settings-modal :is(button,a,input,select,textarea),.settings-panel :is(button,a,input,select,textarea),[data-settings-panel] :is(button,a,input,select,textarea){min-height:44px!important;}
      .settings-modal :is(.set-item,.nav-link,.account-row,.billing-row,.plan-row,.settings-row),.settings-panel :is(.set-item,.nav-link,.account-row,.billing-row,.plan-row,.settings-row),[data-settings-panel] :is(.set-item,.nav-link,.account-row,.billing-row,.plan-row,.settings-row){border-radius:15px!important;border:1px solid rgba(255,255,255,.08)!important;background:rgba(255,255,255,.035)!important;color:#e7ebf4!important;}
      .settings-modal :is(.set-item,.nav-link,.account-row,.billing-row,.plan-row,.settings-row):hover,.settings-panel :is(.set-item,.nav-link,.account-row,.billing-row,.plan-row,.settings-row):hover,[data-settings-panel] :is(.set-item,.nav-link,.account-row,.billing-row,.plan-row,.settings-row):hover{border-color:rgba(185,176,255,.28)!important;background:rgba(139,124,246,.08)!important;}
      .settings-modal input,.settings-modal select,.settings-modal textarea,.settings-panel input,.settings-panel select,.settings-panel textarea,[data-settings-panel] input,[data-settings-panel] select,[data-settings-panel] textarea{border:1px solid rgba(255,255,255,.12)!important;border-radius:14px!important;background:rgba(6,8,13,.70)!important;color:#f8fafc!important;padding-inline:12px!important;}
      .settings-modal .btn.primary,.settings-panel .btn.primary,[data-settings-panel] .btn.primary{background:linear-gradient(135deg,#f7f7fb,#cfc9ff 55%,#8b7cf6)!important;color:#090a10!important;border-color:transparent!important;box-shadow:0 18px 50px rgba(139,124,246,.18)!important;}
      .settings-modal [class*='tab'],.settings-panel [class*='tab'],[data-settings-panel] [class*='tab']{border-radius:999px!important;}
      body.settings-open .app .side,body.modal-open .app .side{pointer-events:none;}
      body.settings-open .settings-modal,body.settings-open [data-settings-panel],body.modal-open .modal-card,body.modal-open .settings-modal{pointer-events:auto;}
      .drawer-backdrop[hidden],.modal-backdrop[hidden],.settings-backdrop[hidden],[data-backdrop][hidden]{display:none!important;pointer-events:none!important;}
      .drawer-backdrop:not([hidden]),.modal-backdrop:not([hidden]),.settings-backdrop:not([hidden]),[data-backdrop]:not([hidden]){pointer-events:auto;}
      body:not(.drawer-open) .drawer-backdrop{display:none!important;pointer-events:none!important;}
      .app .chat-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
      .app .chat-actions .nav-link{justify-content:center!important;text-align:center!important;}
      .app .chat-history-item [aria-label*='Pin'],.app .chat-history-item [aria-label*='Delete'],.app .chat-history-item [aria-label*='Remove'],.app .chat-history-item .pin-chat,.app .chat-history-item .delete-chat{min-width:36px!important;width:36px!important;height:36px!important;border-radius:10px!important;}
      @media(max-width:980px){body.public-home .credit-wallet-packs{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
      @media(max-width:780px){.app{display:block!important;}.app .top{padding-inline:10px!important;gap:8px!important;}.app .top-left,.app .top-actions{gap:6px!important;}.app .top-usage,.stellar-credit-pill{display:inline-flex!important;max-width:132px!important;min-height:36px!important;padding:0 10px!important;font-size:11px!important;overflow:hidden!important;text-overflow:ellipsis!important;}.app .model-pill{max-width:126px!important;overflow:hidden!important;text-overflow:ellipsis!important;}.app .side{position:fixed!important;inset:0 auto 0 0!important;width:min(84vw,320px)!important;transform:translateX(-105%);transition:transform .22s cubic-bezier(.2,.8,.2,1);z-index:80!important;}body.drawer-open .app .side,.app .side.is-open,.app .side.open{transform:translateX(0)!important;}.drawer-backdrop{position:fixed!important;inset:0!important;background:rgba(0,0,0,.48)!important;z-index:70!important;}body.drawer-open .drawer-backdrop{display:block!important;}.mobile-menu,.side-close{display:grid!important;}.app .chat{padding:14px 12px 12px!important;}.app .composer-wrap{padding:10px 10px calc(10px + env(safe-area-inset-bottom))!important;}.app .composer{padding:9px!important;border-radius:20px!important;}.app .composer-tools{gap:6px!important;overflow:auto!important;flex-wrap:nowrap!important;padding-bottom:8px!important;}.app .composer-tool,.app .credit-option{flex:0 0 auto!important;}.app .composer-bar{grid-template-columns:minmax(0,1fr) auto!important;}.app .composer-bar .btn:not(.primary){display:none!important;}.app .quality-strip{grid-template-columns:1fr!important;gap:7px!important;}.app .quality-strip span{border-radius:14px!important;}.settings-modal,.settings-panel,.settings-card,.modal-card,[data-settings-panel]{position:fixed!important;left:8px!important;right:8px!important;bottom:8px!important;top:auto!important;width:auto!important;max-width:none!important;max-height:90dvh!important;border-radius:24px 24px calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-bottom))!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important;}.stellar-settings-hero{padding:18px 16px 14px!important;border-radius:24px 24px 0 0!important;}.stellar-settings-needs ul{grid-template-columns:1fr!important;}.model-menu,.model-list,.model-picker,.model-options,[data-model-menu],[data-model-picker]{position:fixed!important;left:10px!important;right:10px!important;top:72px!important;width:auto!important;max-width:none!important;}}
      @media(max-width:420px){.app .welcome h1,.app .home-welcome h1{font-size:clamp(34px,12vw,48px)!important;}.app .status{font-size:11px!important;}.app .btn.primary{padding-inline:12px!important;}.app .top-usage,.stellar-credit-pill{max-width:112px!important;}body.public-home .credit-wallet-packs{grid-template-columns:1fr!important;}}
    `;
    document.head.appendChild(style);
  }

  function replaceVisibleCreditCopy(root = document.body) {
    const map = new Map([
      ['4,000 credits/month', '900 credits/day'],
      ['12,000 credits/month', '2,500 credits/day'],
      ['48,000 credits/month', '8,000 credits/day'],
      ['Starter includes 4,000 credits/month.', 'Starter includes 900 credits/day.'],
      ['Plus is recommended for daily work with 12,000 credits/month.', 'Plus is recommended for daily work with 2,500 credits/day.'],
      ['Pro includes 48,000 credits/month and Nova.', 'Pro includes 8,000 credits/day and Nova.'],
      ['Free includes 300 daily credits', 'Free gets 300 credits every 24 hours'],
      ['100 welcome Stellar Credits', '500 welcome Stellar Credits'],
      ['Your 100 free Stellar Credits are ready.', 'Your 500 welcome Stellar Credits are ready.'],
      ['Add-on credits stay separate', 'Wallet top-ups stay separate'],
      ['Wallet separate from allowance', 'Wallet separate from daily allowance']
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
    const raw = String(text || '').replace(/💳/g, '').trim();
    if (!raw || /loading/i.test(raw)) return 'Credits ready';
    if (/free credits ready/i.test(raw)) return 'Daily credits ready';
    return raw.replace(/credits available/i, 'credits ready');
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
      pill.textContent = 'Credits ready';
      pill.addEventListener('click', () => {
        const billing = document.querySelector('[data-open-billing],#billing-btn,a[href*="billing"],a[href*="upgrade"],a[href*="credits"]');
        if (billing instanceof HTMLElement) billing.click(); else location.href = '/app?credits=1000';
      });
      mount.appendChild(pill);
    }
    if (!pill) return;
    pill.classList.add('stellar-credit-pill');
    pill.dataset.creditPill = 'true';
    const clean = normaliseCreditText(pill.textContent);
    pill.textContent = clean;
    pill.setAttribute('aria-label', `Credits: ${clean}. Plan credits reset every 24 hours; wallet top-ups stay separate.`);
    pill.setAttribute('title', 'Credits: daily allowance plus wallet top-ups');
  }

  function utcDayString(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function rewardState() {
    const today = utcDayString();
    let stored = {};
    try { stored = JSON.parse(safeGetStorage(STREAK_KEY, '{}')) || {}; } catch { stored = {}; }
    if (stored.last === today) return stored;
    const yesterday = utcDayString(new Date(Date.now() - 86400000));
    const streak = stored.last === yesterday ? Math.min(30, Number(stored.streak || 0) + 1) : 1;
    const next = { last: today, streak };
    safeSetStorage(STREAK_KEY, JSON.stringify(next));
    return next;
  }

  function ensureSettingsPolish(root = document.body) {
    if (!isAppPage()) return;
    const panels = [...root.querySelectorAll('.settings-modal,.settings-panel,.settings-card,[data-settings-panel]')];
    panels.forEach(panel => {
      if (!(panel instanceof HTMLElement)) return;
      panel.classList.add('stellar-settings-shell');
      if (!panel.querySelector('.stellar-settings-hero')) {
        const hero = document.createElement('div');
        hero.className = 'stellar-settings-hero';
        hero.innerHTML = '<strong>Settings</strong><p>Control your account, daily credits, plan, models, voice, privacy and support from one clean place.</p><div class="stellar-settings-chips"><span>Account</span><span>Credits</span><span>Plan</span><span>Privacy</span><span>Support</span></div>';
        panel.prepend(hero);
      }
      if (!panel.querySelector('.stellar-reward-card')) {
        const state = rewardState();
        const reward = document.createElement('div');
        reward.className = 'stellar-reward-card';
        reward.innerHTML = `<strong>Daily rewards</strong><p>Credits reset every 24 hours. Current device streak: Day ${state.streak || 1}. Best server rewards: Day 2 +50, Day 3 +75, Day 7 +150, with anti-abuse checks.</p>`;
        const hero = panel.querySelector('.stellar-settings-hero');
        hero?.after(reward);
      }
      if (!panel.querySelector('.stellar-settings-needs')) {
        const needs = document.createElement('div');
        needs.className = 'stellar-settings-needs';
        needs.innerHTML = '<strong>What Settings needs to have</strong><p>Keep these clear so normal users trust the app and know what they are paying for.</p><ul><li>Account & sign out</li><li>Daily credits + wallet</li><li>Plan & checkout</li><li>Model picker</li><li>Voice/Jarvis controls</li><li>Privacy/export/delete</li><li>Support & billing help</li><li>Devices/StellarX approval</li></ul>';
        panel.appendChild(needs);
      }
      panel.querySelectorAll('button,a,input,select,textarea').forEach(el => el.setAttribute('autocomplete', el.getAttribute('autocomplete') || 'off'));
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
      if (startNote) startNote.textContent = 'Free to start · 300 credits every 24 hours · no card required';
      const proof = hero.querySelector('.oa2-hero-proof');
      if (proof && !proof.dataset.telemetryPolished) {
        proof.dataset.telemetryPolished = 'true';
        proof.replaceChildren(...['Daily chat', '24h credits', 'Website help', 'Lead follow-up', 'Safe approvals'].map(label => {
          const chip = document.createElement('span'); chip.textContent = label; return chip;
        }));
      }
    }
    replaceVisibleCreditCopy();
    const wallet = document.querySelector('.credit-wallet-packs');
    if (wallet && !wallet.querySelector('a[href="/app?credits=300"]')) {
      wallet.prepend(makePackLink('500', '£5', '525 credits', '+5% bonus'));
      wallet.prepend(makePackLink('300', '£3', '300 credits', 'small top-up'));
    }
    [
      ['300', '£3', '300 credits', 'small top-up'],['500', '£5', '525 credits', '+5% bonus'],['1000', '£10', '1,100 credits', '+10% bonus'],['2500', '£25', '2,875 credits', '+15% bonus'],['5000', '£50', '6,000 credits', '+20% bonus', true],['10000', '£100', '12,000 credits', '+20% bonus'],['20000', '£200', '24,000 credits', '+20% bonus']
    ].forEach(([credits, price, amount, bonus, popular]) => {
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
    ensureSettingsPolish();
    const usage = document.getElementById('top-usage');
    setTimeout(() => { if (usage && /loading/i.test(usage.textContent || '')) { usage.textContent = 'Daily credits ready'; ensureCreditIcon(); } }, 1800);
    const syncIdleStop = () => {
      const status = getStatusNode();
      const text = String(status?.textContent || '').trim().toLowerCase();
      document.querySelectorAll('.stop-btn').forEach(button => {
        const idle = !text || /^(ready|signed in|signed out|chat opened|account ready|free credits ready|daily credits ready|credits ready)$/i.test(text);
        button.classList.toggle('is-idle', idle);
        if (idle) button.setAttribute('aria-hidden', 'true'); else button.removeAttribute('aria-hidden');
      });
    };
    syncIdleStop();
    const status = getStatusNode();
    if (status) new MutationObserver(syncIdleStop).observe(status, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => { replaceVisibleCreditCopy(); ensureCreditIcon(); ensureSettingsPolish(); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    const sidebar = document.querySelector('.app .side,#sidebar');
    sidebar?.classList?.remove?.('is-open', 'open');
    const backdrop = document.querySelector('.drawer-backdrop');
    if (backdrop) { backdrop.hidden = true; backdrop.style.display = 'none'; }
  }

  function rescueInteractionState(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.drawer-backdrop,[data-close-drawer]')) { closeDrawer(); return; }
    const opensSettings = target.closest('[data-open-settings],#settings-btn,[aria-label*="Settings"],button');
    const label = `${opensSettings?.textContent || ''} ${opensSettings?.getAttribute?.('aria-label') || ''}`.toLowerCase();
    if (opensSettings && /settings/.test(label)) document.body.classList.remove('drawer-open');
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
    event.preventDefault(); location.href = `mailto:${SUPPORT_EMAIL}?subject=Stellar%20AI%20support`;
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
    const pinned = pinnedByAttribute || /pinned|📌|pin-mark/.test(row.textContent || '') || !!row.querySelector?.('.pin-mark,[data-pin-state="pinned"],[aria-label*="Pinned"],[title*="Pinned"]');
    if (!pinned) return;
    event.preventDefault(); event.stopPropagation(); setStatus('Pinned chats are protected. Unpin first before deleting.', 'warn');
  }

  function track(event) {
    if (!metricsAllowed()) return false;
    const name = String(event || '').trim().toLowerCase();
    if (!allowed.has(name)) return false;
    const body = JSON.stringify({ event: name });
    try { if (navigator.sendBeacon) { const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' })); if (ok) return true; } } catch {}
    try { fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true, credentials: 'same-origin' }).catch(() => {}); return true; } catch { return false; }
  }

  injectBusinessPolish();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { tidyLandingPage(); tidyWorkspaceCopy(); }, { once: true });
  else { tidyLandingPage(); tidyWorkspaceCopy(); }

  window.StellarTelemetry = Object.freeze({ track });
  if (location.pathname === '/' || location.pathname === '/index.html') track('landing-view');
  if (location.pathname === '/app' || location.pathname === '/app.html') track('app-view');
  document.addEventListener('click', supportFallback, true);
  document.addEventListener('click', preventPinnedDelete, true);
  document.addEventListener('click', rescueInteractionState, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDrawer(); });
  document.addEventListener('click', event => {
    const link = event.target?.closest?.('a[href]'); if (!link) return;
    let url; try { url = new URL(link.href, location.href); } catch { return; }
    if (url.hostname === 'buy.stripe.com' || url.hostname === 'checkout.stripe.com') { track('checkout-open'); return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === '/app' || url.pathname === '/app.html') track(url.searchParams.has('upgrade') ? 'upgrade-intent' : 'app-open-cta');
  }, { passive: true });
  addEventListener('error', () => track('client-error'));
  addEventListener('unhandledrejection', () => track('client-error'));
})();