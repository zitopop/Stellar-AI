(() => {
  const endpoint = '/api/client-metric';
  const allowed = new Set([
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error'
  ]);

  const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';
  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';
  function metricsAllowed() {
    try { return localStorage.getItem(METRICS_OPTOUT_KEY) !== '1'; } catch { return true; }
  }

  function injectBusinessPolish() {
    if (document.getElementById('stellar-business-polish-v2')) return;
    const style = document.createElement('style');
    style.id = 'stellar-business-polish-v2';
    style.textContent = `
      html,body{min-width:320px;max-width:100%;overflow-x:hidden;}
      body{touch-action:manipulation;-webkit-text-size-adjust:100%;}
      button,a,input,textarea,select{min-height:44px;}

      /* Public homepage: cleaner daily-use sales path */
      body.public-home .oa2-hero{padding-top:clamp(70px,10vw,126px)!important;padding-bottom:clamp(58px,8vw,96px)!important;}
      body.public-home .oa2-hero h1{max-width:900px!important;text-wrap:balance!important;}
      body.public-home .oa2-lead{max-width:720px!important;text-wrap:balance!important;}
      body.public-home .oa2-start-note{color:#b8bfcc!important;font-weight:760!important;}
      body.public-home .oa2-proof-row,body.public-home .oa2-starters,body.public-home .oa2-quicklinks{display:none!important;}
      body.public-home .oa2-hero-proof{gap:8px!important;}
      body.public-home .oa2-hero-proof span{background:rgba(17,20,30,.82)!important;border-color:rgba(185,176,255,.16)!important;}
      body.public-home .pricing-trust span{white-space:nowrap!important;}
      body.public-home .credit-wallet-packs{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important;}
      body.public-home .credit-wallet-packs a{min-height:84px!important;display:grid!important;place-items:center!important;align-content:center!important;gap:2px!important;padding:12px!important;text-align:center!important;border-radius:16px!important;}
      body.public-home .credit-wallet-packs a span{font-weight:900!important;color:#f6f7fb!important;}
      body.public-home .credit-wallet-packs a span::after{content:' ·';color:#8f96a5!important;font-weight:800!important;}
      body.public-home .credit-wallet-packs a strong{font-size:13px!important;line-height:1.1!important;}
      body.public-home .credit-wallet-packs a small{font-size:11px!important;color:#a9a2ff!important;}
      body.public-home .final-cta{padding-bottom:clamp(58px,8vw,96px)!important;}

      /* App workspace: keep the first screen calm and remove confusing idle controls. */
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
      @media(max-width:980px){body.public-home .credit-wallet-packs{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
      @media(max-width:780px){
        .app{display:block!important;}
        .app .top{padding-inline:12px!important;}
        .app .side{position:fixed!important;inset:0 auto 0 0!important;width:min(84vw,320px)!important;transform:translateX(-105%);transition:transform .22s cubic-bezier(.2,.8,.2,1);z-index:80!important;}
        body.drawer-open .app .side,.app .side.is-open{transform:translateX(0)!important;}
        .drawer-backdrop{position:fixed!important;inset:0!important;background:rgba(0,0,0,.48)!important;z-index:70!important;}
        body.drawer-open .drawer-backdrop{display:block!important;}
        .mobile-menu,.side-close{display:grid!important;}
        .app .top-usage{display:none!important;}
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
      }
      @media(max-width:420px){
        .app .welcome h1,.app .home-welcome h1{font-size:clamp(34px,12vw,48px)!important;}
        .app .status{font-size:11px!important;}
        .app .btn.primary{padding-inline:12px!important;}
        body.public-home .credit-wallet-packs{grid-template-columns:1fr!important;}
      }
    `;
    document.head.appendChild(style);
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
      if (startNote) startNote.textContent = 'Free to start · 300 daily credits · no card required';
      const proof = hero.querySelector('.oa2-hero-proof');
      if (proof && !proof.dataset.telemetryPolished) {
        proof.dataset.telemetryPolished = 'true';
        proof.replaceChildren(...['Daily chat', 'Website help', 'Lead follow-up', 'StellarX worker', 'Safe approvals'].map(label => {
          const chip = document.createElement('span');
          chip.textContent = label;
          return chip;
        }));
      }
    }

    const packs = [
      ['1000', '£10', '1,100 credits', '+10% bonus'],
      ['2500', '£25', '2,875 credits', '+15% bonus'],
      ['5000', '£50', '6,000 credits', '+20% bonus'],
      ['10000', '£100', '12,000 credits', '+20% bonus'],
      ['20000', '£200', '24,000 credits', '+20% bonus']
    ];
    packs.forEach(([credits, price, amount, bonus]) => {
      const link = document.querySelector(`a[href="/app?credits=${credits}"]`);
      if (!link || link.dataset.telemetryPolished === 'true') return;
      link.dataset.telemetryPolished = 'true';
      link.setAttribute('aria-label', `${price} top-up for ${amount}, ${bonus}`);
      link.innerHTML = `<span>${price}</span><strong>${amount}</strong><small>${bonus}</small>`;
    });
  }

  function tidyWorkspaceCopy() {
    const inApp = location.pathname === '/app' || location.pathname === '/app.html' || document.querySelector('.app');
    if (!inApp) return;
    const usage = document.getElementById('top-usage');
    setTimeout(() => {
      if (usage && /loading/i.test(usage.textContent || '')) usage.textContent = 'Free credits ready';
    }, 1800);

    const syncIdleStop = () => {
      const status = document.querySelector('.status,[data-status],#status');
      const text = String(status?.textContent || '').trim().toLowerCase();
      document.querySelectorAll('.stop-btn').forEach(button => {
        const idle = !text || /^(ready|signed in|signed out|chat opened|account ready)$/i.test(text);
        button.classList.toggle('is-idle', idle);
        if (idle) button.setAttribute('aria-hidden', 'true'); else button.removeAttribute('aria-hidden');
      });
    };
    syncIdleStop();
    const status = document.querySelector('.status,[data-status],#status');
    if (status) new MutationObserver(syncIdleStop).observe(status, { childList: true, characterData: true, subtree: true });
  }

  function supportFallback(event) {
    const target = event.target?.closest?.('a,button');
    if (!target) return;
    const text = `${target.textContent || ''} ${target.getAttribute('aria-label') || ''} ${target.getAttribute('href') || ''}`.toLowerCase();
    if (!/(support|account help|refund|copy email|contact)/.test(text)) return;
    if (/copy email/.test(text)) {
      event.preventDefault();
      navigator.clipboard?.writeText(SUPPORT_EMAIL).catch(() => {});
      const status = document.querySelector('.status,[data-status],#status');
      if (status) status.textContent = `Support email copied: ${SUPPORT_EMAIL}`;
      return;
    }
    if (target.tagName === 'A' && target.getAttribute('href')) return;
    event.preventDefault();
    location.href = `mailto:${SUPPORT_EMAIL}?subject=Stellar%20AI%20support`;
  }

  function preventPinnedDelete(event) {
    const target = event.target?.closest?.('button,a');
    if (!target) return;
    const text = `${target.textContent || ''} ${target.getAttribute('aria-label') || ''}`.toLowerCase();
    if (!/(delete|remove|trash)/.test(text)) return;
    const row = target.closest?.('.chat-history-item,[data-chat-row],li');
    if (!row) return;
    let isPinnedByAttribute = false;
    try { isPinnedByAttribute = row.matches?.('[data-pinned="true"]') || false; } catch {}
    const pinned = isPinnedByAttribute || /pinned|ðŸ“Œ/.test(row.textContent || '') || row.querySelector?.('.pin-mark,[data-pin-state="pinned"]');
    if (!pinned) return;
    event.preventDefault();
    event.stopPropagation();
    const status = document.querySelector('.status,[data-status],#status');
    if (status) status.textContent = 'Pinned chats are protected. Unpin first before deleting.';
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

  injectBusinessPolish();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { tidyLandingPage(); tidyWorkspaceCopy(); }, { once: true });
  } else {
    tidyLandingPage();
    tidyWorkspaceCopy();
  }

  window.StellarTelemetry = Object.freeze({ track });
  if (location.pathname === '/' || location.pathname === '/index.html') track('landing-view');
  if (location.pathname === '/app' || location.pathname === '/app.html') track('app-view');

  document.addEventListener('click', supportFallback, true);
  document.addEventListener('click', preventPinnedDelete, true);
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
