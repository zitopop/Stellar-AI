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
    [/\/website-audit-thank-you(?:\.html)?$/i, 'website-audit-thank-you-opened']
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

  function isAppPage() {
    return /\/app(?:\.html)?$/i.test(location.pathname);
  }

  function injectPublicPolish() {
    const oldIds = ['stellar-public-conversion-polish', 'stellar-public-conversion-polish-v2', 'stellar-public-conversion-polish-v3'];
    if (document.getElementById('stellar-public-conversion-polish-v4')) return;
    const style = document.createElement('style');
    style.id = 'stellar-public-conversion-polish-v4';
    style.dataset.replaces = oldIds.join(' ');
    style.textContent = `
      html,body{min-width:320px;max-width:100%;overflow-x:hidden;}
      a,button,input,textarea,select{min-height:44px;}
      .public-home{background:radial-gradient(900px 520px at 50% -12%,rgba(139,124,246,.18),transparent 68%),linear-gradient(180deg,#090a10 0%,#07080d 58%,#05060a 100%)!important;}
      .public-home .site-header,.public-home .topbar{backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important;border-bottom:1px solid rgba(255,255,255,.07)!important;background:rgba(7,8,12,.78)!important;}
      .public-home .site-header a,.public-home .topbar a{border-radius:999px!important;}
      .public-home .oa2-hero,.public-home .hero{position:relative!important;isolation:isolate!important;min-height:auto!important;padding-inline:clamp(16px,4vw,34px)!important;padding-top:clamp(86px,12vw,146px)!important;padding-bottom:clamp(54px,8vw,94px)!important;overflow:hidden!important;}
      .public-home .oa2-hero::before,.public-home .hero::before{content:'';position:absolute;z-index:-1;inset:0;background:radial-gradient(660px 400px at 50% 2%,rgba(139,124,246,.24),transparent 72%),radial-gradient(520px 300px at 70% 18%,rgba(185,176,255,.10),transparent 70%),linear-gradient(180deg,rgba(255,255,255,.025),transparent 55%);pointer-events:none;}
      .public-home .oa2-wordmark,.public-home .eyebrow{display:inline-flex!important;align-items:center!important;gap:8px!important;margin-bottom:14px!important;padding:7px 11px!important;border:1px solid rgba(185,176,255,.16)!important;border-radius:999px!important;background:rgba(17,20,30,.70)!important;color:#b9b0ff!important;font-size:10px!important;font-weight:900!important;letter-spacing:.14em!important;text-transform:uppercase!important;}
      .public-home .oa2-wordmark::before,.public-home .eyebrow::before{content:'✦';font-size:11px;color:#d8d2ff;}
      .public-home .oa2-hero h1,.public-home .hero h1{max-width:980px!important;margin-inline:auto!important;text-wrap:balance!important;font-size:clamp(48px,8.2vw,96px)!important;line-height:.94!important;letter-spacing:-.078em!important;}
      .public-home .oa2-lead,.public-home .hero p{max-width:760px!important;text-wrap:balance!important;color:#b8bfcc!important;font-size:clamp(16px,2.2vw,20px)!important;line-height:1.55!important;}
      .public-home .oa2-start-note,.public-home .start-note{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;margin-top:12px!important;padding:8px 12px!important;border:1px solid rgba(185,176,255,.16)!important;border-radius:999px!important;background:rgba(17,20,30,.66)!important;color:#d9d5ff!important;font-size:12px!important;font-weight:850!important;}
      .public-home .oa2-start-note::before,.public-home .start-note::before{content:'✦';width:18px;height:18px;display:grid;place-items:center;border-radius:999px;background:rgba(185,176,255,.10);color:#b9b0ff;}
      .public-home .oa2-hero-actions,.public-home .hero-actions,.public-home .cta-row{display:flex!important;flex-wrap:wrap!important;gap:10px!important;justify-content:center!important;margin-top:24px!important;}
      .public-home .oa2-hero-actions a,.public-home .hero-actions a,.public-home .cta-row a{min-height:48px!important;align-items:center!important;border-radius:999px!important;padding-inline:18px!important;font-weight:900!important;}
      .public-home .oa2-primary-action,.public-home .btn.primary,.public-home a[href*="/app"].primary{box-shadow:0 18px 54px rgba(139,124,246,.22)!important;}
      .public-home .oa2-hero-proof,.public-home .pricing-trust{display:flex!important;flex-wrap:wrap!important;gap:8px!important;justify-content:center!important;max-width:920px!important;margin-inline:auto!important;}
      .public-home .oa2-hero-proof span,.public-home .pricing-trust span{min-height:34px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0 11px!important;border:1px solid rgba(185,176,255,.14)!important;border-radius:999px!important;background:rgba(17,20,30,.72)!important;color:#dbe0ea!important;font-size:12px!important;font-weight:820!important;white-space:nowrap!important;}
      .public-home .oa2-hero-proof span::before{content:'✦';margin-right:7px;color:#b9b0ff;font-size:11px;}
      .stellar-home-focus,.stellar-landing-flow{width:min(1120px,calc(100% - 32px));margin:0 auto 42px;display:grid;gap:12px;position:relative;z-index:3;}
      .stellar-home-focus{margin-top:-24px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));}
      .stellar-home-focus article,.stellar-landing-flow article{min-width:0;padding:17px;border:1px solid rgba(185,176,255,.14);border-radius:22px;background:linear-gradient(180deg,rgba(18,21,31,.88),rgba(11,13,20,.92));box-shadow:0 22px 70px rgba(0,0,0,.22);}
      .stellar-home-focus i,.stellar-landing-flow i{width:30px;height:30px;display:grid;place-items:center;border-radius:12px;margin-bottom:12px;background:rgba(185,176,255,.10);border:1px solid rgba(185,176,255,.18);color:#b9b0ff;font-style:normal;}
      .stellar-home-focus strong,.stellar-landing-flow strong{display:block;color:#f6f7fb;font-size:14px;letter-spacing:-.02em;margin-bottom:5px;}
      .stellar-home-focus span,.stellar-landing-flow span{display:block;color:#9ba4b3;font-size:12px;line-height:1.45;}
      .stellar-landing-flow{grid-template-columns:repeat(3,minmax(0,1fr));margin-top:0;}
      .stellar-landing-flow article{position:relative;overflow:hidden;}
      .stellar-landing-flow article::after{content:attr(data-step);position:absolute;right:14px;top:12px;color:rgba(185,176,255,.22);font-size:28px;font-weight:900;letter-spacing:-.06em;}
      .stellar-landing-belt{width:min(980px,calc(100% - 32px));margin:-12px auto 42px;padding:12px 14px;border:1px solid rgba(185,176,255,.13);border-radius:20px;background:rgba(17,20,30,.62);display:flex;flex-wrap:wrap;justify-content:center;gap:8px;color:#dbe0ea;font-size:12px;font-weight:820;}
      .stellar-landing-belt span{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;}
      .stellar-landing-belt span::before{content:'•';color:#b9b0ff;}
      .public-home .plans,.public-home .pricing-grid,.public-home .plan-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))!important;gap:14px!important;align-items:stretch!important;}
      .public-home .plans .plan,.public-home .plan-card,.public-home .price-card{min-width:0!important;overflow:hidden!important;border-radius:22px!important;}
      .public-home .plans .plan .btn,.public-home .plan-card .btn,.public-home .price-card .btn{width:100%!important;}
      .public-home .section,.public-home section{scroll-margin-top:86px;}
      .public-home .faq details,.public-home details{border-radius:16px!important;overflow:hidden!important;}
      .public-home img{max-width:100%!important;height:auto!important;}
      @media(max-width:900px){.stellar-home-focus,.stellar-landing-flow{grid-template-columns:1fr;max-width:640px;}.stellar-home-focus{margin-top:-12px;}}
      @media(max-width:760px){
        .public-home .nav,.public-home .links,.topbar .links{gap:7px!important;overflow:auto!important;white-space:nowrap!important;padding-bottom:4px!important;}
        .public-home .oa2-hero,.public-home .hero{padding-top:clamp(76px,13vh,110px)!important;padding-bottom:44px!important;}
        .public-home .oa2-hero h1,.public-home .hero h1{font-size:clamp(42px,13vw,64px)!important;line-height:.98!important;letter-spacing:-.07em!important;}
        .public-home .oa2-lead,.public-home .hero p{font-size:15px!important;}
        .public-home .oa2-composer{border-radius:22px!important;}
        .public-home .oa2-hero-proof,.public-home .pricing-trust{justify-content:flex-start!important;overflow:auto!important;flex-wrap:nowrap!important;padding:0 12px 4px!important;scrollbar-width:none!important;}
        .public-home .oa2-hero-proof::-webkit-scrollbar,.public-home .pricing-trust::-webkit-scrollbar{display:none!important;}
        .public-home .plans,.public-home .pricing-grid,.public-home .plan-grid{grid-template-columns:1fr!important;}
        .stellar-home-focus,.stellar-landing-flow,.stellar-landing-belt{width:calc(100% - 24px);margin-bottom:32px;}
        .stellar-landing-belt{justify-content:flex-start;overflow:auto;flex-wrap:nowrap;scrollbar-width:none;}
        .stellar-landing-belt::-webkit-scrollbar{display:none;}
      }
    `;
    document.head.appendChild(style);
  }

  function polishHomepageContent() {
    if (!isPublicHome() || document.body.dataset.homepagePolished === 'v4') return;
    document.body.dataset.homepagePolished = 'v4';
    const hero = document.querySelector('.oa2-hero,.hero');
    if (!hero) return;

    const title = hero.querySelector('#hero-title,h1');
    if (title) title.textContent = 'Your daily AI workspace.';

    const lead = hero.querySelector('.oa2-lead,p');
    if (lead) lead.textContent = 'Chat, plan, write, improve your website, follow up leads and run daily work from one clean Stellar AI account.';

    const wordmark = hero.querySelector('.oa2-wordmark,.eyebrow');
    if (wordmark) wordmark.textContent = 'STELLAR AI · CLEAN WORKSPACE';

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

    const firstCta = hero.querySelector('a[href*="/app"],a[href*="app.html"],.btn.primary,.oa2-primary-action');
    if (firstCta && /start|get|try|open|launch/i.test(firstCta.textContent || '')) firstCta.textContent = 'Start free';

    const secondCta = hero.querySelector('.oa2-secondary-action,a[href*="pricing"],a[href="#pricing"]');
    if (secondCta && /plan|price|pricing|view/i.test(secondCta.textContent || '')) secondCta.textContent = 'See plans';

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

    if (!document.querySelector('.stellar-landing-belt')) {
      const belt = document.createElement('div');
      belt.className = 'stellar-landing-belt';
      belt.setAttribute('aria-label', 'Why people try Stellar AI');
      belt.innerHTML = ['No card to start', 'Built for daily use', 'Works on phone', 'Clear credits', 'Owner tools stay private'].map((item) => `<span>${item}</span>`).join('');
      document.querySelector('.stellar-home-focus')?.insertAdjacentElement('afterend', belt);
    }

    if (!document.querySelector('.stellar-landing-flow')) {
      const flow = document.createElement('section');
      flow.className = 'stellar-landing-flow';
      flow.setAttribute('aria-label', 'How Stellar AI works');
      flow.innerHTML = [
        ['01', 'Ask normally', 'Type what you need: a reply, page fix, plan, idea, script or customer follow-up.'],
        ['02', 'Stellar organises it', 'The workspace keeps the task clear, shows useful options and avoids messy buttons.'],
        ['03', 'Approve bigger actions', 'Credits, purchases, connected tools and owner actions stay understandable before anything important runs.']
      ].map(([step, title, copy]) => `<article data-step="${step}"><i aria-hidden="true">${step}</i><strong>${title}</strong><span>${copy}</span></article>`).join('');
      document.querySelector('.stellar-landing-belt')?.insertAdjacentElement('afterend', flow);
    }
  }

  function injectAppSettingsPolish() {
    if (!isAppPage()) return;
    if (document.getElementById('stellar-settings-polish-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-settings-polish-v1';
    style.textContent = `
      body.settings-open .app .side,body.modal-open .app .side{pointer-events:none!important;filter:saturate(.86) brightness(.72);}
      .settings-modal,.settings-panel,.settings-card,[data-settings-panel]{width:min(780px,calc(100vw - 28px))!important;max-width:780px!important;border:1px solid rgba(185,176,255,.16)!important;border-radius:26px!important;background:linear-gradient(180deg,rgba(19,22,31,.98),rgba(10,12,18,.98))!important;box-shadow:0 30px 110px rgba(0,0,0,.52),0 0 0 1px rgba(139,124,246,.06)!important;color:#f7f8fb!important;overflow:hidden!important;}
      .settings-modal *,.settings-panel *,.settings-card *,[data-settings-panel] *{min-width:0;}
      .settings-header,.settings-head,.account-header,.billing-header{position:relative!important;padding:4px 4px 16px!important;margin-bottom:12px!important;border-bottom:1px solid rgba(255,255,255,.07)!important;}
      .settings-header::before,.settings-head::before{content:'Workspace controls';display:inline-flex;margin:0 0 9px;padding:5px 9px;border:1px solid rgba(185,176,255,.16);border-radius:999px;background:rgba(139,124,246,.10);color:#b9b0ff;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;}
      .settings-header h2,.settings-head h2,.settings-card h2,[data-settings-panel] h2{margin:0!important;font-size:clamp(24px,4vw,34px)!important;line-height:1.02!important;letter-spacing:-.055em!important;color:#fff!important;}
      .settings-header p,.settings-head p{margin:7px 0 0!important;color:#a7afbd!important;line-height:1.55!important;}
      .settings-grid,.settings-section,.settings-group,.settings-block,.settings-card section,[data-settings-section]{display:grid!important;gap:9px!important;}
      .settings-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:12px!important;}
      .settings-wide,.settings-plan-hero,.settings-plan-actions,.settings-wallet-row,.call-setup-panel,#set-billing-row,#settings-signout-row{grid-column:1 / -1!important;}
      .settings-tabs,.settings-tabbar,.settings-nav,[data-settings-tabs]{display:flex!important;gap:8px!important;overflow-x:auto!important;overscroll-behavior-x:contain!important;scrollbar-width:thin!important;padding:4px 2px 12px!important;margin:0 0 12px!important;border-bottom:1px solid rgba(255,255,255,.06)!important;}
      .settings-tabs button,.settings-tabbar button,.settings-nav button,[data-settings-tabs] button{flex:0 0 auto!important;min-height:38px!important;padding:0 12px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:999px!important;background:rgba(255,255,255,.035)!important;color:#bfc6d3!important;font-size:12px!important;font-weight:850!important;}
      .settings-tabs button[aria-selected="true"],.settings-tabs button.active,.settings-tabbar button[aria-selected="true"],.settings-nav button.active,[data-settings-tabs] button[aria-selected="true"]{background:linear-gradient(135deg,rgba(139,124,246,.22),rgba(185,176,255,.10))!important;border-color:rgba(185,176,255,.32)!important;color:#fff!important;box-shadow:0 10px 28px rgba(139,124,246,.12)!important;}
      .settings-section,.settings-group,.settings-block,.settings-card section,[data-settings-section]{margin:12px 0!important;padding:12px!important;border:1px solid rgba(255,255,255,.065)!important;border-radius:18px!important;background:rgba(255,255,255,.028)!important;}
      .settings-row,.set-item,.settings-option,.settings-card label,.settings-card li,[data-settings-row]{min-height:58px!important;display:grid!important;grid-template-columns:34px minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;padding:12px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:15px!important;background:rgba(255,255,255,.032)!important;color:#eef1f7!important;}
      .settings-row:hover,.set-item:hover,.settings-option:hover,[data-settings-row]:hover{border-color:rgba(185,176,255,.22)!important;background:rgba(139,124,246,.07)!important;}
      .settings-icon{width:34px!important;height:34px!important;min-width:34px!important;display:grid!important;place-items:center!important;border-radius:12px!important;background:rgba(185,176,255,.07)!important;color:#b9b0ff!important;}
      .settings-row-copy,.settings-credit-copy{min-width:0!important;display:grid!important;gap:3px!important;}
      .settings-row strong,.settings-credit-copy strong{font-size:13px!important;font-weight:820!important;letter-spacing:-.015em!important;color:#fff!important;}
      .settings-row small,.set-item small,.settings-option small,.settings-muted,.settings-credit-copy small{display:block!important;color:#9aa3b3!important;font-size:11px!important;line-height:1.38!important;overflow-wrap:anywhere!important;}
      .settings-row-meta{justify-self:end!important;color:#8c95a5!important;font-size:11px!important;white-space:nowrap!important;}
      .settings-credit,.settings-wallet-row,.settings-plan-actions{grid-template-columns:34px minmax(0,1fr)!important;align-items:start!important;}
      .settings-credit .credit-buy-controls,.settings-credit .topup-status,.settings-wallet-row .credit-buy-controls,.settings-wallet-row .topup-status{grid-column:2 / -1!important;width:100%!important;}
      .credit-buy-controls{display:grid!important;grid-template-columns:minmax(160px,1fr) auto!important;gap:8px!important;align-items:center!important;margin-top:10px!important;}
      .credit-buy-controls select{width:100%!important;min-height:42px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:13px!important;background:rgba(7,9,14,.74)!important;color:#f7f8fb!important;padding:0 12px!important;}
      .topup-status{display:block!important;margin-top:8px!important;color:#aeb7c6!important;font-size:12px!important;}
      .topup-status.error{color:#ffb7bf!important}.topup-status.good{color:#a8f2d1!important}.topup-status.warn{color:#ffe6a8!important}
      .settings-modal input,.settings-modal select,.settings-modal textarea,.settings-panel input,.settings-panel select,.settings-panel textarea,[data-settings-panel] input,[data-settings-panel] select,[data-settings-panel] textarea{width:100%!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:13px!important;background:rgba(7,9,14,.74)!important;color:#f7f8fb!important;padding:10px 12px!important;}
      @media(max-width:780px){.settings-modal,.settings-panel,.settings-card,[data-settings-panel]{left:8px!important;right:8px!important;bottom:8px!important;top:auto!important;width:auto!important;max-width:none!important;max-height:90dvh!important;border-radius:24px 24px calc(24px + env(safe-area-inset-bottom)) calc(24px + env(safe-area-inset-bottom))!important;padding:16px!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important;}.settings-grid{grid-template-columns:1fr!important;padding:8px 0 0!important;}.settings-header,.settings-head{position:sticky!important;top:0!important;z-index:3!important;background:linear-gradient(180deg,rgba(19,22,31,.98),rgba(19,22,31,.90))!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;}.settings-row,.set-item,.settings-option,[data-settings-row]{grid-template-columns:34px minmax(0,1fr)!important;align-items:start!important;}.settings-row-meta{grid-column:2 / -1!important;justify-self:start!important}.credit-buy-controls{grid-template-columns:1fr!important}.settings-credit .credit-buy-controls,.settings-credit .topup-status,.settings-wallet-row .credit-buy-controls,.settings-wallet-row .topup-status{grid-column:1 / -1!important}.settings-credit,.settings-wallet-row,.settings-plan-actions{grid-template-columns:34px minmax(0,1fr)!important}}
    `;
    document.head.appendChild(style);
  }

  function injectOwnerPerksPolish() {
    if (!isAppPage()) return;
    if (document.getElementById('stellar-owner-perks-polish-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-owner-perks-polish-v1';
    style.textContent = `
      .stellar-owner-perks-guide{grid-column:1 / -1!important;margin:12px 0!important;padding:14px!important;border:1px solid rgba(185,176,255,.18)!important;border-radius:18px!important;background:linear-gradient(180deg,rgba(139,124,246,.10),rgba(12,14,21,.82))!important;color:#f7f8fb!important;display:grid!important;gap:10px!important;}
      .stellar-owner-perks-guide strong{display:block;font-size:14px!important;letter-spacing:-.025em!important;color:#fff!important;}
      .stellar-owner-perks-guide p{margin:2px 0 0!important;color:#9fa8b7!important;font-size:12px!important;line-height:1.45!important;}
      .stellar-owner-perks-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))!important;gap:8px!important;}
      .stellar-owner-perk{min-width:0;padding:10px!important;border:1px solid rgba(255,255,255,.075)!important;border-radius:14px!important;background:rgba(255,255,255,.035)!important;}
      .stellar-owner-perk b{display:flex!important;align-items:center!important;gap:7px!important;font-size:12px!important;color:#f5f6fb!important;}
      .stellar-owner-perk b::before{content:'✦';width:17px;height:17px;display:inline-grid;place-items:center;border-radius:999px;background:rgba(185,176,255,.10);color:#b9b0ff;font-size:10px;}
      .stellar-owner-perk span{display:block;margin-top:5px;color:#929baa;font-size:11px;line-height:1.35;}
      .settings-row[data-owner-explained="true"] .settings-row-copy small{color:#aeb7c6!important;}
      .settings-row[data-owner-explained="true"] .settings-row-meta{font-size:10px!important;text-transform:uppercase!important;letter-spacing:.08em!important;color:#b9b0ff!important;}
      @media(max-width:640px){.stellar-owner-perks-grid{grid-template-columns:1fr!important}.stellar-owner-perks-guide{padding:12px!important;}}
    `;
    document.head.appendChild(style);
  }

  function injectCustomCreditPolish() {
    if (!isAppPage()) return;
    if (document.getElementById('stellar-custom-credit-polish-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-custom-credit-polish-v1';
    style.textContent = `
      .stellar-custom-credit-topup{grid-column:1 / -1;width:100%;margin-top:10px;padding:12px!important;border:1px solid rgba(185,176,255,.16)!important;border-radius:16px!important;background:linear-gradient(180deg,rgba(139,124,246,.085),rgba(255,255,255,.026))!important;color:#f7f8fb!important;display:grid!important;gap:10px!important;}
      .stellar-custom-credit-topup strong{display:block;font-size:13px!important;color:#fff!important;letter-spacing:-.02em!important;}
      .stellar-custom-credit-topup small{display:block;margin-top:3px;color:#9aa3b3!important;font-size:11px!important;line-height:1.4!important;}
      .stellar-custom-credit-controls{display:grid!important;grid-template-columns:minmax(110px,1fr) auto!important;gap:8px!important;align-items:end!important;}
      .stellar-custom-credit-field{display:grid!important;gap:5px!important;}
      .stellar-custom-credit-field label{font-size:10px!important;font-weight:900!important;letter-spacing:.1em!important;text-transform:uppercase!important;color:#b9b0ff!important;}
      .stellar-custom-credit-field input{min-height:42px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:13px!important;background:rgba(7,9,14,.72)!important;color:#f7f8fb!important;padding:0 12px!important;font-weight:850!important;}
      .stellar-custom-credit-estimate{min-height:32px;display:flex!important;align-items:center!important;color:#d7d2ff!important;font-size:12px!important;font-weight:820!important;}
      .stellar-custom-credit-buy{min-height:42px!important;padding:0 12px!important;border:1px solid rgba(185,176,255,.26)!important;border-radius:13px!important;background:rgba(139,124,246,.16)!important;color:#f4f1ff!important;font-size:12px!important;font-weight:900!important;white-space:nowrap!important;}
      .stellar-custom-credit-buy:disabled{opacity:.58!important;cursor:not-allowed!important;}
      @media(max-width:640px){.stellar-custom-credit-controls{grid-template-columns:1fr!important}.stellar-custom-credit-buy{width:100%!important}.stellar-custom-credit-estimate{min-height:24px!important}}
    `;
    document.head.appendChild(style);
  }

  const ownerPerkCopy = {
    jarvis: { title: 'Jarvis', summary: 'Private owner command centre for missions, urgent calls and business decisions.', meta: 'Owner only', href: '/jarvis' },
    computer: { title: 'Computer', summary: 'StellarX computer access for approved desktop tasks and browser/workspace actions.', meta: 'Signed in', href: '/desktop' },
    roblox: { title: 'Roblox Studio', summary: 'Owner-only Roblox/FiveM-style building tools, scripts and server workflow helpers.', meta: 'Owner only', href: '/roblox-studio' }
  };

  function explainOwnerRow(row, copy) {
    if (!(row instanceof HTMLElement) || !copy) return;
    row.dataset.ownerExplained = 'true';
    row.setAttribute('title', `${copy.title}: ${copy.summary}`);
    row.setAttribute('aria-label', `${copy.title}. ${copy.summary} ${copy.meta}.`);
    const strong = row.querySelector('strong');
    if (strong) strong.textContent = copy.title;
    const small = row.querySelector('small');
    if (small) small.textContent = copy.summary;
    const meta = row.querySelector('.settings-row-meta');
    if (meta) meta.innerHTML = `${copy.meta} <span aria-hidden="true">›</span>`;
  }

  function ensureOwnerPerksGuide(panel) {
    if (!(panel instanceof HTMLElement)) return;
    if (panel.querySelector('.stellar-owner-perks-guide')) return;
    const ownerRows = panel.querySelectorAll('.owner-only,[data-owner-only="true"],#desktop-agent-nav,#roblox-studio-nav,a[href="/jarvis"]');
    if (!ownerRows.length) return;
    const guide = document.createElement('section');
    guide.className = 'stellar-owner-perks-guide owner-only';
    guide.dataset.ownerPerksGuide = 'true';
    guide.innerHTML = `<div><strong>Owner perks explained</strong><p>Private tools stay hidden from normal users. This guide shows what each owner/signed-in perk does before you open it.</p></div><div class="stellar-owner-perks-grid"><div class="stellar-owner-perk"><b>Jarvis</b><span>Owner command centre for missions, calls and decision support.</span></div><div class="stellar-owner-perk"><b>Computer</b><span>StellarX desktop access for approved tasks on your connected computer.</span></div><div class="stellar-owner-perk"><b>Roblox Studio</b><span>Owner-only building and script helper for game/server workflows.</span></div></div>`;
    const advanced = Array.from(ownerRows).find((node) => node instanceof HTMLElement);
    advanced?.insertAdjacentElement('beforebegin', guide);
  }

  function polishOwnerPerks() {
    if (!isAppPage()) return;
    injectOwnerPerksPolish();
    explainOwnerRow(document.querySelector('a[href="/jarvis"],.owner-only[href="/jarvis"],[data-settings-advanced][href="/jarvis"]'), ownerPerkCopy.jarvis);
    explainOwnerRow(document.querySelector('#desktop-agent-nav'), ownerPerkCopy.computer);
    explainOwnerRow(document.querySelector('#roblox-studio-nav'), ownerPerkCopy.roblox);
    document.querySelectorAll('.settings-modal,.settings-panel,.settings-card,[data-settings-panel]').forEach(ensureOwnerPerksGuide);
  }

  function getSessionToken() {
    try {
      const state = JSON.parse(localStorage.getItem('stellar-store') || '{}');
      return typeof state.session === 'string' ? state.session : '';
    } catch { return ''; }
  }

  function formatPounds(pence) {
    const value = Math.max(0, Number(pence) || 0) / 100;
    return value % 1 === 0 ? `£${value.toFixed(0)}` : `£${value.toFixed(2)}`;
  }

  function topupBonusPence(amountPence) {
    const amount = Math.round(Number(amountPence) || 0);
    if (amount >= 5000) return Math.round(amount * 0.20);
    if (amount >= 2000) return Math.round(amount * 0.15);
    if (amount >= 1000) return Math.round(amount * 0.10);
    if (amount >= 500) return Math.round(amount * 0.05);
    return 0;
  }

  function topupCredits(amountPence) {
    const amount = Math.max(0, Math.round(Number(amountPence) || 0));
    return amount + topupBonusPence(amount);
  }

  function normaliseCustomTopupPence(value) {
    const pounds = Number(value);
    if (!Number.isFinite(pounds)) return 0;
    return Math.round((pounds * 100) / 50) * 50;
  }

  function setCustomTopupStatus(message, kind = '') {
    const status = document.getElementById('topup-status');
    if (!status) return;
    status.textContent = message;
    status.className = `topup-status${kind ? ' ' + kind : ''}`;
  }

  function updateCustomTopupEstimate(card) {
    const input = card?.querySelector('#custom-topup-pound');
    const estimate = card?.querySelector('[data-custom-credit-estimate]');
    if (!(input instanceof HTMLInputElement) || !estimate) return 0;
    const amountPence = normaliseCustomTopupPence(input.value);
    if (amountPence < 300 || amountPence > 20000) {
      estimate.textContent = 'Choose £3–£200 in 50p steps';
      return amountPence;
    }
    estimate.textContent = `${formatPounds(amountPence)} → ${topupCredits(amountPence).toLocaleString()} credits`;
    return amountPence;
  }

  async function startCustomCreditCheckout(card) {
    const input = card?.querySelector('#custom-topup-pound');
    const button = card?.querySelector('[data-custom-credit-buy]');
    if (!(input instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement)) return;
    const amountPence = normaliseCustomTopupPence(input.value);
    if (amountPence < 300 || amountPence > 20000 || amountPence % 50 !== 0) {
      setCustomTopupStatus('Choose a custom amount between £3 and £200 in 50p steps.', 'error');
      input.focus();
      return;
    }
    input.value = (amountPence / 100).toFixed(amountPence % 100 === 0 ? 0 : 2);
    updateCustomTopupEstimate(card);

    const token = getSessionToken();
    if (!token) {
      setCustomTopupStatus('Sign in to buy custom Stellar credits.', 'warn');
      document.getElementById('welcome-modal') && (document.getElementById('welcome-modal').hidden = false);
      document.body.classList.add('auth-open');
      return;
    }

    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Opening Stripe…';
    setCustomTopupStatus('Connecting to secure checkout…');
    track('checkout-clicked', 'custom-credit-topup');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan:'topup', amount:amountPence })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Your sign-in expired. Sign in again to add credits.');
      if (!res.ok || !data.url) throw new Error(data.error || 'Custom credit checkout could not start.');
      let checkoutUrl = null;
      try { checkoutUrl = new URL(data.url); } catch {}
      if (!checkoutUrl || checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') throw new Error('Stripe returned an unexpected checkout address.');
      try { sessionStorage.setItem('stellar-pending-topup', JSON.stringify({ amountPence, startedAt:Date.now(), custom:true })); } catch {}
      setCustomTopupStatus('Stripe is ready. Redirecting…', 'good');
      location.assign(checkoutUrl.href);
    } catch (error) {
      setCustomTopupStatus(error?.message || 'Could not reach custom credit checkout.', 'error');
      button.disabled = false;
      button.textContent = label;
    }
  }

  function ensureCustomCreditTopup() {
    if (!isAppPage()) return;
    injectCustomCreditPolish();
    const topupRow = document.getElementById('topup-row');
    if (!(topupRow instanceof HTMLElement) || topupRow.querySelector('.stellar-custom-credit-topup')) return;
    const controls = topupRow.querySelector('.credit-buy-controls');
    const card = document.createElement('section');
    card.className = 'stellar-custom-credit-topup';
    card.dataset.customCreditTopup = 'true';
    card.innerHTML = `<div><strong>Custom credits</strong><small>Choose £3–£200 in 50p steps. Quick packs stay above for simple buys.</small></div><div class="stellar-custom-credit-controls"><div class="stellar-custom-credit-field"><label for="custom-topup-pound">Custom amount</label><input id="custom-topup-pound" type="number" inputmode="decimal" min="3" max="200" step="0.5" value="10" aria-describedby="custom-topup-estimate"></div><button class="stellar-custom-credit-buy" type="button" data-custom-credit-buy>Buy custom credits</button><span id="custom-topup-estimate" class="stellar-custom-credit-estimate" data-custom-credit-estimate>£10 → 1,100 credits</span></div>`;
    controls?.insertAdjacentElement('afterend', card);
    const input = card.querySelector('#custom-topup-pound');
    input?.addEventListener('input', () => updateCustomTopupEstimate(card));
    input?.addEventListener('blur', () => {
      const amountPence = normaliseCustomTopupPence(input.value);
      if (amountPence >= 300 && amountPence <= 20000) input.value = (amountPence / 100).toFixed(amountPence % 100 === 0 ? 0 : 2);
      updateCustomTopupEstimate(card);
    });
    card.querySelector('[data-custom-credit-buy]')?.addEventListener('click', () => startCustomCreditCheckout(card));
    updateCustomTopupEstimate(card);
  }

  function polishSettingsPanel() {
    if (!isAppPage()) return;
    document.querySelectorAll('.settings-modal,.settings-panel,.settings-card,[data-settings-panel]').forEach((panel) => {
      if (!(panel instanceof HTMLElement) || panel.hidden) return;
      panel.dataset.settingsPolished = 'true';
      panel.dataset.settingsLayout = 'clean';
      panel.setAttribute('aria-label', panel.getAttribute('aria-label') || 'Stellar AI settings');
      const close = panel.querySelector('button[aria-label^="Close"],.modal-x,.topup-close,[data-close-modal],.settings-close-x');
      if (close instanceof HTMLElement) close.setAttribute('title', close.getAttribute('title') || 'Close settings');
      panel.querySelectorAll('button,a').forEach((node) => {
        const text = (node.textContent || node.getAttribute('aria-label') || '').trim();
        if (text && !node.getAttribute('title')) node.setAttribute('title', text.slice(0, 60));
      });
      panel.querySelectorAll('#topup-row,#set-billing-row,.settings-plan-actions,.settings-plan-hero,.settings-wallet-row,.call-setup-panel,#settings-signout-row').forEach((node) => {
        if (node instanceof HTMLElement) node.classList.add('settings-wide');
      });
    });
    polishOwnerPerks();
    ensureCustomCreditTopup();
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
    if (!isAppPage()) return;
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
    injectOwnerPerksPolish();
    injectCustomCreditPolish();
    normalizeSupportLinks();
    polishSettingsPanel();
    polishOwnerPerks();
    ensureCustomCreditTopup();
    track(eventForPath(location.pathname), document.body?.className || 'page');
    trackRetentionSignals();

    if (isAppPage() && document.body) {
      let settingsPolishQueued = false;
      const queueSettingsPolish = () => {
        if (settingsPolishQueued) return;
        settingsPolishQueued = true;
        requestAnimationFrame(() => {
          settingsPolishQueued = false;
          polishSettingsPanel();
          polishOwnerPerks();
          ensureCustomCreditTopup();
        });
      };
      new MutationObserver(queueSettingsPolish).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-selected'] });
    }

    document.addEventListener('click', (event) => {
      const link = event.target?.closest?.('a,button');
      if (!link) return;
      const text = `${link.getAttribute('aria-label') || ''} ${link.textContent || ''} ${link.getAttribute('href') || ''}`.toLowerCase();
      if (/settings|account|billing|owner|jarvis|computer|roblox|credit|topup|top-up/.test(text)) {
        polishSettingsPanel();
        polishOwnerPerks();
        ensureCustomCreditTopup();
      }
      if (/checkout|upgrade|starter|plus|pro|pricing|plan/.test(text)) track('plan-clicked', 'pricing');
      if (/stripe|payment|billing/.test(text)) track('checkout-clicked', 'billing');
      if (/support|help|refund|cancel/.test(text)) track('support-clicked', 'support');
      if (/plugin|github|vercel|gmail|drive|discord|shopify/.test(text)) track('plugin-opened', 'plugins');
    }, { passive: true });
  });
})();
