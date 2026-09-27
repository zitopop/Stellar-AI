// Stellar public/app analytics — privacy-safe counters only.
(function () {
  const allowedHost = /(^|\.)trystellarai\.com$/.test(location.hostname) || /\.vercel\.app$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!allowedHost) return;

  const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';
  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';

  function metricsAllowed() {
    try { return localStorage.getItem(METRICS_OPTOUT_KEY) !== '1'; } catch { return true; }
  }

  const pageMap = [
    [/\/app(?:\.html)?$/i, 'app-opened'],
    [/\/plugins(?:\.html)?$/i, 'plugin-opened'],
    [/\/support(?:\.html)?$/i, 'support-clicked'],
    [/\/thank-you(?:\.html)?$/i, 'thank-you-opened'],
    [/\/business-thank-you(?:\.html)?$/i, 'business-thank-you-opened'],
    [/\/ai-receptionist-thank-you(?:\.html)?$/i, 'ai-receptionist-thank-you-opened'],
    [/\/website-audit-thank-you(?:\.html)?$/i, 'website-audit-thank-you-opened'],
  ];

  function eventForPath(pathname) {
    const match = pageMap.find(([pattern]) => pattern.test(pathname));
    return match ? match[1] : 'homepage-opened';
  }

  function safeContext(value) {
    return String(value || 'general').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'general';
  }

  function isPublicHome() {
    return document.body?.classList?.contains('public-home') || /^\/(?:index\.html)?$/i.test(location.pathname);
  }

  function injectPublicPolish() {
    if (document.getElementById('stellar-public-conversion-polish-v3')) return;
    const style = document.createElement('style');
    style.id = 'stellar-public-conversion-polish-v3';
    style.textContent = `
      html,body{min-width:320px;max-width:100%;overflow-x:hidden;}
      a,button,input,textarea,select{min-height:44px;}
      .public-home .site-header,.topbar{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07)!important;background:rgba(7,8,12,.78)!important;}
      .public-home .site-header a,.public-home .topbar a{border-radius:999px;}
      .public-home .oa2-hero,.public-home .hero{position:relative;isolation:isolate;min-height:auto!important;padding-inline:clamp(16px,4vw,34px)!important;padding-top:clamp(86px,12vw,142px)!important;padding-bottom:clamp(48px,8vw,90px)!important;}
      .public-home .oa2-hero::before,.public-home .hero::before{content:'';position:absolute;z-index:-1;inset:0;background:radial-gradient(620px 380px at 50% 4%,rgba(139,124,246,.20),transparent 72%),radial-gradient(460px 280px at 70% 18%,rgba(185,176,255,.08),transparent 68%);pointer-events:none;}
      .public-home .oa2-hero h1,.public-home .hero h1{max-width:960px!important;margin-inline:auto!important;text-wrap:balance!important;font-size:clamp(48px,8vw,94px)!important;line-height:.95!important;letter-spacing:-.075em!important;}
      .public-home .oa2-lead,.public-home .hero p{max-width:760px!important;text-wrap:balance!important;color:#b8bfcc!important;font-size:clamp(16px,2.2vw,20px)!important;line-height:1.55!important;}
      .public-home .oa2-start-note,.public-home .start-note{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;margin-top:12px!important;padding:8px 12px!important;border:1px solid rgba(185,176,255,.16)!important;border-radius:999px!important;background:rgba(17,20,30,.66)!important;color:#d9d5ff!important;font-size:12px!important;font-weight:850!important;}
      .public-home .oa2-start-note::before,.public-home .start-note::before{content:'✦';width:18px;height:18px;display:grid;place-items:center;border-radius:999px;background:rgba(185,176,255,.10);color:#b9b0ff;}
      .public-home .oa2-hero-actions,.public-home .hero-actions,.public-home .cta-row{display:flex!important;flex-wrap:wrap!important;gap:10px!important;justify-content:center!important;margin-top:24px!important;}
      .public-home .oa2-hero-actions a,.public-home .hero-actions a,.public-home .cta-row a{min-height:48px!important;align-items:center!important;border-radius:999px!important;padding-inline:18px!important;font-weight:900!important;}
      .public-home .oa2-hero-proof,.public-home .pricing-trust{display:flex!important;flex-wrap:wrap!important;gap:8px!important;justify-content:center!important;max-width:880px!important;margin-inline:auto!important;}
      .public-home .oa2-hero-proof span,.public-home .pricing-trust span{min-height:34px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0 11px!important;border:1px solid rgba(185,176,255,.14)!important;border-radius:999px!important;background:rgba(17,20,30,.72)!important;color:#dbe0ea!important;font-size:12px!important;font-weight:820!important;white-space:nowrap!important;}
      .public-home .oa2-hero-proof span::before{content:'✦';margin-right:7px;color:#b9b0ff;font-size:11px;}
      .stellar-home-focus{width:min(1120px,calc(100% - 32px));margin:-22px auto 42px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;position:relative;z-index:3;}
      .stellar-home-focus article{min-width:0;padding:17px;border:1px solid rgba(185,176,255,.14);border-radius:22px;background:linear-gradient(180deg,rgba(18,21,31,.88),rgba(11,13,20,.92));box-shadow:0 22px 70px rgba(0,0,0,.22);}
      .stellar-home-focus i{width:30px;height:30px;display:grid;place-items:center;border-radius:12px;margin-bottom:12px;background:rgba(185,176,255,.10);border:1px solid rgba(185,176,255,.18);color:#b9b0ff;font-style:normal;}
      .stellar-home-focus strong{display:block;color:#f6f7fb;font-size:14px;letter-spacing:-.02em;margin-bottom:5px;}
      .stellar-home-focus span{display:block;color:#9ba4b3;font-size:12px;line-height:1.45;}
      .public-home .plans,.public-home .pricing-grid,.public-home .plan-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))!important;gap:14px!important;align-items:stretch!important;}
      .public-home .plans .plan,.public-home .plan-card,.public-home .price-card{min-width:0!important;overflow:hidden!important;border-radius:22px!important;}
      .public-home .plans .plan .btn,.public-home .plan-card .btn,.public-home .price-card .btn{width:100%!important;}
      .public-home .section,.public-home section{scroll-margin-top:86px;}
      .public-home .faq details,.public-home details{border-radius:16px!important;overflow:hidden!important;}
      .public-home img{max-width:100%!important;height:auto!important;}
      @media(max-width:900px){.stellar-home-focus{grid-template-columns:1fr;max-width:640px;margin-top:-12px;}}
      @media(max-width:760px){
        .public-home .nav,.public-home .links,.topbar .links{gap:7px!important;overflow:auto!important;white-space:nowrap!important;padding-bottom:4px!important;}
        .public-home .oa2-hero,.public-home .hero{padding-top:clamp(76px,13vh,110px)!important;padding-bottom:44px!important;}
        .public-home .oa2-hero h1,.public-home .hero h1{font-size:clamp(42px,13vw,64px)!important;line-height:.98!important;letter-spacing:-.07em!important;}
        .public-home .oa2-lead,.public-home .hero p{font-size:15px!important;}
        .public-home .oa2-composer{border-radius:22px!important;}
        .public-home .oa2-hero-proof,.public-home .pricing-trust{justify-content:flex-start!important;overflow:auto!important;flex-wrap:nowrap!important;padding:0 12px 4px!important;scrollbar-width:none!important;}
        .public-home .oa2-hero-proof::-webkit-scrollbar,.public-home .pricing-trust::-webkit-scrollbar{display:none!important;}
        .public-home .plans,.public-home .pricing-grid,.public-home .plan-grid{grid-template-columns:1fr!important;}
        .stellar-home-focus{width:calc(100% - 24px);margin-bottom:32px;}
      }
    `;
    document.head.appendChild(style);
  }

  function polishHomepageContent() {
    if (!isPublicHome() || document.body.dataset.homepagePolished === 'true') return;
    document.body.dataset.homepagePolished = 'true';
    const hero = document.querySelector('.oa2-hero,.hero');
    if (!hero) return;

    const title = hero.querySelector('#hero-title,h1');
    if (title) title.textContent = 'Your daily AI workspace.';

    const lead = hero.querySelector('.oa2-lead,p');
    if (lead) lead.textContent = 'Chat, plan, write, fix your website, follow up leads and manage daily work from one clean Stellar AI account.';

    const note = hero.querySelector('.oa2-start-note,.start-note');
    if (note) note.textContent = 'Free to start · 300 credits every 24 hours · promo and giveaway credits for Discord events';

    const proof = hero.querySelector('.oa2-hero-proof,.pricing-trust');
    if (proof) {
      proof.replaceChildren(...['Daily chat', 'Website help', 'Lead follow-up', 'Promo credits', 'Discord giveaways', 'Safe approvals'].map((label) => {
        const chip = document.createElement('span');
        chip.textContent = label;
        return chip;
      }));
    }

    const firstCta = hero.querySelector('a[href*="/app"],a[href*="app.html"],.btn.primary');
    if (firstCta && /start|get|try|open|launch/i.test(firstCta.textContent || '')) firstCta.textContent = 'Start free';

    if (!document.querySelector('.stellar-home-focus')) {
      const focus = document.createElement('section');
      focus.className = 'stellar-home-focus';
      focus.setAttribute('aria-label', 'What Stellar AI helps with');
      focus.innerHTML = [
        ['✦', 'Chat that gets work done', 'Ask, write, plan and solve daily tasks without a messy dashboard.'],
        ['⌁', 'Website and business help', 'Improve pages, offers, support replies, SEO ideas and customer follow-up.'],
        ['↗', 'Credits that feel clear', 'Free daily credits first, wallet top-ups separate, with upgrades when people need more.'],
        ['★', 'Community promo credits', 'Run Discord giveaways, launch promos and creator rewards with Stellar credits.']
      ].map(([icon, title, copy]) => `<article><i aria-hidden="true">${icon}</i><strong>${title}</strong><span>${copy}</span></article>`).join('');
      hero.insertAdjacentElement('afterend', focus);
    }
  }

  function injectAppSettingsPolish() {
    if (!/\/app(?:\.html)?$/i.test(location.pathname)) return;
    if (document.getElementById('stellar-settings-polish-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-settings-polish-v1';
    style.textContent = `
      body.settings-open .app .side,body.modal-open .app .side{pointer-events:none!important;filter:saturate(.86) brightness(.72);}
      .settings-modal,.settings-panel,.settings-card,[data-settings-panel]{width:min(760px,calc(100vw - 28px))!important;max-width:760px!important;border:1px solid rgba(185,176,255,.16)!important;border-radius:26px!important;background:linear-gradient(180deg,rgba(19,22,31,.98),rgba(10,12,18,.98))!important;box-shadow:0 30px 110px rgba(0,0,0,.52),0 0 0 1px rgba(139,124,246,.06)!important;color:#f7f8fb!important;}
      .settings-modal *,.settings-panel *,.settings-card *,[data-settings-panel] *{min-width:0;}
      .settings-header,.settings-head,.account-header,.billing-header{position:relative!important;padding:2px 2px 14px!important;margin-bottom:12px!important;border-bottom:1px solid rgba(255,255,255,.07)!important;}
      .settings-header::before,.settings-head::before{content:'Workspace controls';display:inline-flex;margin:0 0 9px;padding:5px 9px;border:1px solid rgba(185,176,255,.16);border-radius:999px;background:rgba(139,124,246,.10);color:#b9b0ff;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}
      .settings-header h2,.settings-head h2,.settings-card h2,[data-settings-panel] h2{margin:0!important;font-size:clamp(24px,4vw,34px)!important;line-height:1.02!important;letter-spacing:-.055em!important;color:#fff!important;}
      .settings-header p,.settings-head p{margin:7px 0 0!important;color:#a7afbd!important;line-height:1.55!important;}
      .settings-tabs,.settings-tabbar,.settings-nav,[data-settings-tabs]{display:flex!important;gap:8px!important;overflow-x:auto!important;overscroll-behavior-x:contain!important;scrollbar-width:thin!important;padding:4px 2px 12px!important;margin:0 0 12px!important;border-bottom:1px solid rgba(255,255,255,.06)!important;}
      .settings-tabs button,.settings-tabbar button,.settings-nav button,[data-settings-tabs] button{flex:0 0 auto!important;min-height:38px!important;padding:0 12px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:999px!important;background:rgba(255,255,255,.035)!important;color:#bfc6d3!important;font-size:12px!important;font-weight:850!important;}
      .settings-tabs button[aria-selected="true"],.settings-tabs button.active,.settings-tabbar button[aria-selected="true"],.settings-nav button.active,[data-settings-tabs] button[aria-selected="true"]{background:linear-gradient(135deg,rgba(139,124,246,.22),rgba(185,176,255,.10))!important;border-color:rgba(185,176,255,.32)!important;color:#fff!important;box-shadow:0 10px 28px rgba(139,124,246,.12)!important;}
      .settings-section,.settings-group,.settings-block,.settings-card section,[data-settings-section]{display:grid!important;gap:10px!important;margin:12px 0!important;padding:12px!important;border:1px solid rgba(255,255,255,.065)!important;border-radius:18px!important;background:rgba(255,255,255,.028)!important;}
      .settings-row,.set-item,.settings-option,.settings-card label,.settings-card li,[data-settings-row]{min-height:52px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:12px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:15px!important;background:rgba(255,255,255,.035)!important;color:#eef1f7!important;}
      .settings-row small,.set-item small,.settings-option small,.settings-muted{display:block!important;color:#8f98a8!important;font-size:11px!important;line-height:1.35!important;}
      .settings-modal input,.settings-modal select,.settings-modal textarea,.settings-panel input,.settings-panel select,.settings-panel textarea,[data-settings-panel] input,[data-settings-panel] select,[data-settings-panel] textarea{width:100%!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:13px!important;background:rgba(7,9,14,.74)!important;color:#f7f8fb!important;padding:10px 12px!important;}
      @media(max-width:780px){.settings-modal,.settings-panel,.settings-card,[data-settings-panel]{left:8px!important;right:8px!important;bottom:8px!important;top:auto!important;width:auto!important;max-width:none!important;max-height:90dvh!important;border-radius:24px 24px calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-bottom))!important;padding:16px!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important;}.settings-header,.settings-head{position:sticky!important;top:0!important;z-index:3!important;background:linear-gradient(180deg,rgba(19,22,31,.98),rgba(19,22,31,.90))!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;}.settings-row,.set-item,.settings-option,[data-settings-row]{align-items:flex-start!important;flex-direction:column!important;}}
    `;
    document.head.appendChild(style);
  }

  function polishSettingsPanel() {
    if (!/\/app(?:\.html)?$/i.test(location.pathname)) return;
    document.querySelectorAll('.settings-modal,.settings-panel,.settings-card,[data-settings-panel]').forEach((panel) => {
      if (!(panel instanceof HTMLElement) || panel.hidden || panel.dataset.settingsPolished === 'true') return;
      panel.dataset.settingsPolished = 'true';
      panel.setAttribute('aria-label', panel.getAttribute('aria-label') || 'Stellar AI settings');
      const close = panel.querySelector('button[aria-label^="Close"],.modal-x,.topup-close,[data-close-modal]');
      if (close instanceof HTMLElement) close.setAttribute('title', close.getAttribute('title') || 'Close settings');
      panel.querySelectorAll('button,a').forEach((node) => {
        const text = (node.textContent || node.getAttribute('aria-label') || '').trim();
        if (text && !node.getAttribute('title')) node.setAttribute('title', text.slice(0, 60));
      });
    });
  }

  function normalizeSupportLinks() {
    document.querySelectorAll('a[href="#"],button').forEach((node) => {
      const text = `${node.textContent || ''} ${node.getAttribute('aria-label') || ''}`.toLowerCase();
      if (!/(support|account help|refund|cancel|copy email)/.test(text)) return;
      if (node.tagName === 'A' && (!node.getAttribute('href') || node.getAttribute('href') === '#')) {
        node.setAttribute('href', `mailto:${SUPPORT_EMAIL}?subject=Stellar%20AI%20support`);
      }
    });
  }

  function track(event, context) {
    if (!metricsAllowed()) return false;
    try {
      const body = JSON.stringify({ event, context: safeContext(context) });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon('/api/track-event', blob)) return;
      }
      fetch('/api/track-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch {}
  }

  window.StellarTrack = track;

  function trackRetentionSignals() {
    if (!/\/app(?:\.html)?$/i.test(location.pathname)) return;
    try {
      const now = Date.now();
      const day = new Date().toISOString().slice(0, 10);
      const lastDay = localStorage.getItem('stellar_metrics_active_day');
      if (lastDay !== day) {
        localStorage.setItem('stellar_metrics_active_day', day);
        track('active-day', 'app');
      }
      const lastSession = Number(localStorage.getItem('stellar_metrics_last_session_at') || 0);
      if (!lastSession || now - lastSession >= 30 * 60 * 1000) track('workspace-session-started', lastSession ? 'returning' : 'first');
      localStorage.setItem('stellar_metrics_last_session_at', String(now));
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectPublicPolish();
    polishHomepageContent();
    injectAppSettingsPolish();
    normalizeSupportLinks();
    polishSettingsPanel();
    track(eventForPath(location.pathname), document.body?.className || 'page');
    trackRetentionSignals();

    if (/\/app(?:\.html)?$/i.test(location.pathname) && document.body) {
      let settingsPolishQueued = false;
      const queueSettingsPolish = () => {
        if (settingsPolishQueued) return;
        settingsPolishQueued = true;
        requestAnimationFrame(() => {
          settingsPolishQueued = false;
          polishSettingsPanel();
        });
      };
      new MutationObserver(queueSettingsPolish).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-selected'] });
    }

    document.addEventListener('click', (event) => {
      const link = event.target?.closest?.('a,button');
      if (!link) return;
      const text = `${link.getAttribute('aria-label') || ''} ${link.textContent || ''} ${link.getAttribute('href') || ''}`.toLowerCase();
      if (/settings|account|billing/.test(text)) polishSettingsPanel();
      if (/checkout|upgrade|starter|plus|pro|pricing|plan/.test(text)) track('plan-clicked', 'pricing');
      if (/stripe|payment|billing/.test(text)) track('checkout-clicked', 'billing');
      if (/support|help|refund|cancel/.test(text)) track('support-clicked', 'support');
      if (/plugin|github|vercel|gmail|drive|discord|shopify/.test(text)) track('plugin-opened', 'plugins');
    }, { passive: true });
  });
})();