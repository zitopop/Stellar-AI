(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const TITLE = 'Stellar AI — Clean AI Workspace for Chat, Coding & Business';
  const DESCRIPTION = 'A clean AI workspace for chat, coding, research, scripts, websites and business tasks. Start free, then upgrade when you need more credits or stronger models.';

  function ensureMeta(key, name, value) {
    let node = $(`meta[${key}="${name}"]`);
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(key, name);
      document.head.appendChild(node);
    }
    node.setAttribute('content', value);
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function setLinkText(selector, value, href) {
    const node = $(selector);
    if (!node) return;
    node.textContent = value;
    node.setAttribute('aria-label', value);
    if (href) node.setAttribute('href', href);
  }

  function cleanMetadata() {
    if (!document.body.classList.contains('public-home')) return;
    document.title = TITLE;
    ensureMeta('name', 'description', DESCRIPTION);
    ensureMeta('property', 'og:title', TITLE);
    ensureMeta('property', 'og:description', DESCRIPTION);
    ensureMeta('name', 'twitter:title', TITLE);
    ensureMeta('name', 'twitter:description', DESCRIPTION);
    const canonical = $('link[rel="canonical"]') || document.head.appendChild(document.createElement('link'));
    canonical.rel = 'canonical';
    canonical.href = 'https://trystellarai.com/';
  }

  function closeMenu(restoreFocus = false) {
    const toggle = $('#nav-toggle');
    const menu = $('#mobile-nav');
    if (!toggle || !menu) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    if (restoreFocus && wasOpen) toggle.focus();
  }

  function wireMenu() {
    const toggle = $('#nav-toggle');
    const menu = $('#mobile-nav');
    if (!toggle || !menu || toggle.dataset.stellarMenuWired === 'true') return;
    toggle.dataset.stellarMenuWired = 'true';
    toggle.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });
    $$('a', menu).forEach((link) => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(true); });
  }

  function wirePrompt() {
    const form = $('#build-form');
    const input = $('#build-prompt');
    if (input) input.placeholder = 'Ask Stellar to build, fix, write or plan something…';
    if (!form || form.dataset.stellarPromptWired === 'true') return;
    form.dataset.stellarPromptWired = 'true';
    form.addEventListener('submit', (event) => {
      const value = String(input?.value || '').trim().slice(0, 2000);
      if (!value) {
        event.preventDefault();
        input?.setCustomValidity('Type what you want Stellar AI to do.');
        input?.reportValidity();
        return;
      }
      input.value = value;
    });
    input?.addEventListener('input', () => input.setCustomValidity(''));
  }

  function injectCleanStyles() {
    if ($('#stellar-clean-landing-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-clean-landing-v1';
    style.textContent = `
      body.public-home{background:radial-gradient(900px 500px at 50% -200px,rgba(139,124,246,.14),transparent 70%),#090b10!important;overflow-x:hidden!important;color:#f7f8fb!important}
      body.public-home .site-header{background:rgba(9,11,16,.86)!important;border-bottom:1px solid rgba(255,255,255,.06)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}
      body.public-home .nav{min-height:64px!important}
      body.public-home .nav-links a:nth-child(n+4):not([href="/support"]),
      body.public-home .oa2-proof-row,
      body.public-home .oa2-starters,
      body.public-home .oa2-quicklinks,
      body.public-home .oa2-trust-path,
      body.public-home .oa2-business-first,
      body.public-home .oa2-delivery,
      body.public-home .oa2-how,
      body.public-home .oa2-feature,
      body.public-home .oa2-guides,
      body.public-home .oa2-business,
      body.public-home .stellar-proof,
      body.public-home .stellar-growth-strip,
      body.public-home section[aria-labelledby="updates-title"]{display:none!important}
      body.public-home .oa2-hero{width:min(880px,calc(100% - 28px))!important;min-height:auto!important;padding:clamp(72px,10vw,132px) 0 clamp(66px,9vw,108px)!important;text-align:center!important}
      body.public-home .oa2-wordmark{color:#a69bff!important;font:900 10px/1 'DM Mono',monospace!important;letter-spacing:.16em!important}
      body.public-home .oa2-hero h1{max-width:820px!important;margin:18px auto 0!important;color:#f7f8fb!important;-webkit-text-fill-color:#f7f8fb!important;font-size:clamp(46px,7.5vw,86px)!important;font-weight:680!important;line-height:.98!important;letter-spacing:-.066em!important;text-wrap:balance!important}
      body.public-home .oa2-lead{max-width:640px!important;margin:22px auto 0!important;color:#adb5c2!important;font-size:clamp(16px,1.8vw,20px)!important;line-height:1.6!important}
      body.public-home .oa2-hero-proof{margin:20px auto 0!important;display:flex!important;justify-content:center!important;flex-wrap:wrap!important;gap:8px!important}
      body.public-home .oa2-hero-proof span{min-height:32px!important;padding:0 11px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:999px!important;background:rgba(255,255,255,.035)!important;color:#cfd5df!important;font-size:11px!important;font-weight:780!important}
      body.public-home .oa2-composer{width:min(720px,100%)!important;margin:30px auto 0!important;padding:12px!important;border:1px solid rgba(255,255,255,.105)!important;border-radius:20px!important;background:rgba(18,21,30,.94)!important;box-shadow:0 24px 80px rgba(0,0,0,.26)!important}
      body.public-home .oa2-composer textarea{min-height:72px!important;color:#f7f8fb!important;-webkit-text-fill-color:#f7f8fb!important;background:transparent!important;font-size:15px!important}
      body.public-home .oa2-composer-tools,body.public-home .oa2-model{display:none!important}
      body.public-home .oa2-composer-bar{justify-content:flex-end!important}
      body.public-home .oa2-start-note{margin-top:13px!important;color:#8f98a7!important;font-size:12px!important}
      body.public-home .oa2-hero-actions{display:flex!important;justify-content:center!important;gap:10px!important;margin-top:22px!important;flex-wrap:wrap!important}
      body.public-home .oa2-primary-action,body.public-home .oa2-secondary-action{min-height:46px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:13px!important;padding:0 16px!important;font-size:13px!important;font-weight:850!important;text-decoration:none!important}
      body.public-home .oa2-primary-action{background:#f1efff!important;color:#101218!important;border:1px solid #f1efff!important}
      body.public-home .oa2-secondary-action{background:rgba(255,255,255,.04)!important;color:#d7dce7!important;border:1px solid rgba(255,255,255,.09)!important}
      body.public-home .stellar-simple-path{width:min(1080px,calc(100% - 32px));margin:0 auto;padding:clamp(54px,8vw,92px) 0;border-top:1px solid rgba(255,255,255,.06)}
      body.public-home .stellar-simple-head{text-align:center;max-width:720px;margin:0 auto 24px;display:grid;gap:10px}
      body.public-home .stellar-simple-head span{color:#a69bff;font:900 10px/1 'DM Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
      body.public-home .stellar-simple-head h2{margin:0;color:#f5f7fb;font-size:clamp(34px,5.6vw,60px);line-height:1;letter-spacing:-.058em}
      body.public-home .stellar-simple-head p{margin:0;color:#aab3c1;line-height:1.7}
      body.public-home .stellar-simple-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      body.public-home .stellar-simple-card{min-height:210px;border:1px solid rgba(255,255,255,.085);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));padding:20px;display:grid;align-content:start;gap:9px;text-decoration:none!important}
      body.public-home .stellar-simple-card small{color:#a69bff;font-size:10px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
      body.public-home .stellar-simple-card strong{color:#f6f7fb;font-size:20px;letter-spacing:-.035em}
      body.public-home .stellar-simple-card p{margin:0;color:#aab3c1;font-size:13px;line-height:1.65}
      body.public-home .oa2-audience,body.public-home .oa2-preview,body.public-home .pricing-section,body.public-home .faq-section{border-top:1px solid rgba(255,255,255,.06)!important;padding-top:clamp(56px,8vw,92px)!important;padding-bottom:clamp(56px,8vw,92px)!important}
      body.public-home .oa2-audience-grid,body.public-home .oa2-audience-grid-simple{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
      body.public-home .oa2-audience-grid article,body.public-home .plan,body.public-home .faqs details{border-radius:20px!important;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018))!important;border-color:rgba(255,255,255,.085)!important;box-shadow:none!important}
      body.public-home .plans{gap:12px!important}
      body.public-home .pricing-trust{display:none!important}
      body.public-home .credit-wallet-quick{max-width:760px!important;margin:0 auto 20px!important}
      @media(max-width:900px){body.public-home .stellar-simple-grid,body.public-home .oa2-audience-grid,body.public-home .oa2-audience-grid-simple{grid-template-columns:1fr!important}body.public-home .oa2-preview-shell{grid-template-columns:1fr!important}}
      @media(max-width:700px){body.public-home .oa2-hero{width:calc(100% - 24px)!important;padding-top:58px!important}body.public-home .oa2-hero h1{font-size:clamp(40px,12vw,56px)!important}body.public-home .oa2-hero-actions{display:grid!important;grid-template-columns:1fr!important;width:100%!important}body.public-home .oa2-primary-action,body.public-home .oa2-secondary-action{width:100%!important}body.public-home .stellar-simple-path,body.public-home .pricing-section,body.public-home .oa2-audience,body.public-home .oa2-preview,body.public-home .faq-section,.public-home .final-cta{width:calc(100% - 24px)!important}.public-home .plans{grid-template-columns:1fr!important}.public-home .credit-wallet-packs{grid-template-columns:1fr 1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function polishHero() {
    setText('#hero-title', 'A clean AI workspace for real work.');
    setText('.oa2-lead', 'Chat, code, fix scripts, plan websites and handle business tasks in one simple place. Start free, then upgrade only when you need more credits or stronger models.');
    setText('.oa2-start-note', 'Free daily credits · no card to start · secure Stripe checkout');
    setLinkText('.oa2-primary-action', 'Open Stellar free', '/app?welcome=1');
    setLinkText('.oa2-secondary-action', 'See plans', '/plans');
    const proof = $('.oa2-hero-proof');
    if (proof) proof.innerHTML = '<span>Chat</span><span>Code</span><span>Scripts</span><span>Business</span>';
  }

  function injectSimplePath() {
    if ($('#stellar-simple-path')) return;
    const hero = $('.oa2-hero') || $('main > section');
    if (!hero) return;
    const section = document.createElement('section');
    section.id = 'stellar-simple-path';
    section.className = 'stellar-simple-path';
    section.innerHTML = `
      <div class="stellar-simple-head">
        <span>WHAT STELLAR DOES</span>
        <h2>Simple enough to try. Useful enough to keep.</h2>
        <p>Visitors should understand Stellar in seconds: ask for help, get useful work, then pay when they need more capacity.</p>
      </div>
      <div class="stellar-simple-grid">
        <a class="stellar-simple-card" href="/app?welcome=1"><small>01</small><strong>Ask anything</strong><p>Use Stellar for writing, planning, research, coding and business tasks without a messy dashboard.</p></a>
        <a class="stellar-simple-card" href="/script-generator-hub"><small>02</small><strong>Build scripts</strong><p>Roblox, FiveM, QBCore and game-code pages bring Google visitors into useful starter prompts.</p></a>
        <a class="stellar-simple-card" href="/plans"><small>03</small><strong>Upgrade clearly</strong><p>Free daily credits help people try it. Paid plans and top-ups unlock more work when they need it.</p></a>
      </div>
    `;
    hero.insertAdjacentElement('afterend', section);
  }

  function simplifyPricing() {
    $$('.plan').forEach((plan) => {
      if (plan.dataset.stellarCleaned === 'true') return;
      plan.dataset.stellarCleaned = 'true';
      const name = (plan.querySelector('h3,h2')?.textContent || '').toLowerCase();
      if (name.includes('plus')) plan.classList.add('featured');
    });
  }

  function init() {
    if (!document.body.classList.contains('public-home')) return;
    cleanMetadata();
    injectCleanStyles();
    wireMenu();
    wirePrompt();
    polishHero();
    injectSimplePath();
    simplifyPricing();
    document.documentElement.dataset.stellarCleanLanding = 'v1';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();