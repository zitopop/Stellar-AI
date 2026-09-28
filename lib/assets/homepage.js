(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const HOME_TITLE = 'Stellar AI — AI Workspace for Chat, Coding, Files & Business';
  const HOME_DESCRIPTION = 'Chat, code, research, work with files, connect approved tools and manage business tasks in one clean AI workspace with clear credits and upgrade paths.';
  const HOME_KEYWORDS = 'Stellar AI, AI workspace, AI chat, AI coding assistant, AI files, AI plugins, business AI, productivity AI, StellarX';

  function ensureMeta(key, name, value) {
    let node = $(`meta[${key}="${name}"]`);
    if (!node) {
      node = document.createElement('meta');
      node.setAttribute(key, name);
      document.head.appendChild(node);
    }
    node.setAttribute('content', value);
  }

  function setMeta(selector, attr, value) {
    const node = $(selector);
    if (node) node.setAttribute(attr, value);
  }

  function cleanMetadata() {
    if (!document.body.classList.contains('public-home')) return;
    document.title = HOME_TITLE;
    ensureMeta('name', 'description', HOME_DESCRIPTION);
    ensureMeta('name', 'keywords', HOME_KEYWORDS);
    ensureMeta('property', 'og:title', HOME_TITLE);
    ensureMeta('property', 'og:description', HOME_DESCRIPTION);
    ensureMeta('property', 'og:site_name', 'Stellar AI');
    ensureMeta('property', 'og:type', 'website');
    ensureMeta('property', 'og:url', 'https://trystellarai.com');
    ensureMeta('name', 'twitter:title', HOME_TITLE);
    ensureMeta('name', 'twitter:description', HOME_DESCRIPTION);
    ensureMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('meta[property="og:image:alt"]', 'content', 'Stellar AI — clean AI workspace for chat, coding, files and business tasks');
    setMeta('meta[name="twitter:image:alt"]', 'content', 'Stellar AI — clean AI workspace for chat, coding, files and business tasks');

    const canonical = $('link[rel="canonical"]') || document.head.appendChild(document.createElement('link'));
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', 'https://trystellarai.com');

    const ldJson = $('script[type="application/ld+json"]');
    if (!ldJson) return;
    try {
      const data = JSON.parse(ldJson.textContent || '{}');
      const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
      for (const item of graph) {
        if (item && item['@type'] === 'SoftwareApplication') {
          item.applicationCategory = 'ProductivityApplication';
          item.description = HOME_DESCRIPTION;
        }
        if (item && item['@type'] === 'WebSite') {
          item.name = 'Stellar AI';
          item.url = 'https://trystellarai.com/';
        }
      }
      ldJson.textContent = JSON.stringify(data);
    } catch {
      // Keep the page working even if older JSON-LD is malformed.
    }
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
    $$('a', menu).forEach(link => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });
    window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  }

  function wireBuildPrompt() {
    const form = document.getElementById('build-form');
    const prompt = document.getElementById('build-prompt');
    if (prompt && !prompt.placeholder.includes('Ask Stellar')) {
      prompt.placeholder = 'Ask Stellar to chat, code, research, improve your website, or fix a business task…';
    }
    form?.addEventListener('submit', event => {
      const value = prompt.value.trim().slice(0, 2000);
      if (!value) {
        event.preventDefault();
        prompt.setCustomValidity('Describe what you want Stellar AI to do.');
        prompt.reportValidity();
        return;
      }
      prompt.value = value;
    });
    prompt?.addEventListener('input', () => prompt.setCustomValidity(''));
  }

  function injectRevenuePolishStyles() {
    if (!document.body.classList.contains('public-home') || $('#stellar-revenue-polish-v40')) return;
    const style = document.createElement('style');
    style.id = 'stellar-revenue-polish-v40';
    style.textContent = `
      body.public-home .stellar-home-trustbar{width:min(840px,100%);margin:18px auto 0;display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
      body.public-home .stellar-home-trustbar span{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border:1px solid rgba(184,175,255,.20);border-radius:999px;background:rgba(255,255,255,.04);color:#d3d8e4;font-size:11px;font-weight:780;box-shadow:0 10px 30px rgba(0,0,0,.14)}
      body.public-home .stellar-credit-hero{width:min(790px,100%);margin:18px auto 0;padding:13px 15px;border:1px solid rgba(94,225,170,.19);border-radius:17px;background:linear-gradient(180deg,rgba(94,225,170,.085),rgba(255,255,255,.02));color:#ccd6e1;font-size:12px;line-height:1.7;text-align:center;box-shadow:0 18px 70px rgba(0,0,0,.18)}
      body.public-home .stellar-credit-hero strong{color:#effff8;font-weight:900}
      body.public-home :where(.oa2-jarvis-panel,.oa2-audience-grid article,.oa2-preview-shell,.plan,.faq-item,.workspace,.support-card,.guide-card){border-radius:24px!important;background:linear-gradient(180deg,rgba(255,255,255,.048),rgba(255,255,255,.016))!important;border-color:rgba(255,255,255,.095)!important}
      body.public-home .plan{position:relative!important;overflow:hidden!important;padding-top:28px!important}
      body.public-home .plan.featured:before{content:'Best value';position:absolute;right:14px;top:12px;z-index:1;padding:5px 9px;border-radius:999px;background:rgba(184,175,255,.15);border:1px solid rgba(184,175,255,.25);color:#e1dcff;font-size:10px;font-weight:950;letter-spacing:.04em;text-transform:uppercase}
      body.public-home .stellar-plan-kicker{margin:8px 0 12px;color:#7ee2b8;font-size:11px;font-weight:900;letter-spacing:.02em;text-transform:uppercase}
      body.public-home .stellar-revenue-note{margin-top:12px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.037);border:1px solid rgba(255,255,255,.085);color:#b5becd;font-size:12px;line-height:1.65}
      body.public-home .pricing-foot{border:1px solid rgba(255,255,255,.085)!important;border-radius:18px!important;background:rgba(255,255,255,.028)!important;padding:14px 16px!important}
      body.public-home .oa2-primary-action,body.public-home .pricing-section a,body.public-home .plan a,body.public-home .plan button{min-height:44px!important}
      @media(max-width:640px){body.public-home .stellar-home-trustbar{display:grid;grid-template-columns:1fr;gap:7px}body.public-home .stellar-home-trustbar span{justify-content:center}body.public-home .stellar-credit-hero{text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function upsertAfter(anchor, id, className, html) {
    if (!anchor || document.getElementById(id)) return;
    const node = document.createElement('div');
    node.id = id;
    node.className = className;
    node.innerHTML = html;
    anchor.insertAdjacentElement('afterend', node);
  }

  function polishHero() {
    if (!document.body.classList.contains('public-home')) return;
    const title = $('#hero-title');
    if (title) title.textContent = 'Your AI workspace for chat, code and business.';
    const lead = $('.oa2-lead');
    if (lead) lead.textContent = 'Use Stellar AI to write, code, research, work with files, improve your website and run business tasks from one clean workspace. Start free, then upgrade when you need more credits, stronger models or deeper project work.';
    const note = $('.oa2-start-note');
    if (note) note.textContent = 'Free daily credits · paid monthly credits · instant top-ups when work cannot wait';
    const primary = $('.oa2-primary-action');
    if (primary) textAndLabel(primary, 'Open Stellar AI');
    const secondary = $('.oa2-secondary-action');
    if (secondary) textAndLabel(secondary, 'See plans and credits');

    const actionAnchor = $('.oa2-hero-actions') || $('.hero-actions') || note;
    upsertAfter(actionAnchor, 'stellar-home-trustbar', 'stellar-home-trustbar', '<span>💬 Chat and code</span><span>💳 Clear credits</span><span>⚡ Upgrade when needed</span><span>🛡️ User-approved tools</span>');
    upsertAfter($('#stellar-home-trustbar'), 'stellar-credit-hero', 'stellar-credit-hero', '<strong>Simple credit system:</strong> daily free credits let people try Stellar AI, paid plans add serious monthly capacity, and credit packs let users keep working instantly when they hit a limit.');
  }

  function textAndLabel(node, value) {
    node.textContent = value;
    node.setAttribute('aria-label', value);
  }

  function rewritePricingCopy() {
    if (!document.body.classList.contains('public-home')) return;
    const plans = $$('.plan, .pricing-card');
    plans.forEach(plan => {
      if (plan.dataset.stellarRevenuePolished === 'true') return;
      plan.dataset.stellarRevenuePolished = 'true';
      const name = (plan.querySelector('h3,h2')?.textContent || '').toLowerCase();
      const kicker = document.createElement('div');
      kicker.className = 'stellar-plan-kicker';
      if (name.includes('free')) kicker.textContent = 'Try the workspace';
      else if (name.includes('starter')) kicker.textContent = 'First paid step';
      else if (name.includes('plus')) kicker.textContent = 'Most people start here';
      else if (name.includes('pro')) kicker.textContent = 'Heavy users and business';
      else kicker.textContent = 'More capacity';
      const heading = plan.querySelector('h3,h2');
      if (heading && !heading.nextElementSibling?.classList.contains('stellar-plan-kicker')) heading.insertAdjacentElement('afterend', kicker);

      const note = document.createElement('div');
      note.className = 'stellar-revenue-note';
      if (name.includes('free')) note.textContent = 'Best for testing the workspace before paying. Credits are visible so users understand when upgrading saves time.';
      else if (name.includes('starter')) note.textContent = 'A simple entry plan for people who want more monthly credits without jumping straight to Pro.';
      else if (name.includes('plus')) note.textContent = 'The main upgrade path: more credits, stronger models and enough capacity for regular work.';
      else if (name.includes('pro')) note.textContent = 'For serious users who need maximum capacity, deeper tools and business-grade workflow.';
      else note.textContent = 'Credits and upgrade value are explained before checkout, so users know exactly what they are buying.';
      plan.appendChild(note);
    });

    const pricingFoot = $('.pricing-foot');
    if (pricingFoot && !pricingFoot.dataset.stellarCreditCopy) {
      pricingFoot.dataset.stellarCreditCopy = 'true';
      const p = document.createElement('p');
      p.textContent = 'Credits are separate from plan access: free credits help people try the app, paid monthly credits reward subscribers, and add-on credit packs let users continue immediately instead of waiting.';
      pricingFoot.appendChild(p);
    }
  }

  function injectAppPreviewSection() {
    if (!document.body.classList.contains('public-home') || document.getElementById('stellar-app-preview-section')) return;

    const style = document.createElement('style');
    style.id = 'stellar-app-preview-styles-v1';
    style.textContent = `
      body.public-home .stellar-app-preview-section{width:min(1180px,calc(100% - 36px));margin:0 auto;padding:clamp(58px,8vw,104px) 0;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.055)}
      body.public-home .stellar-app-preview-head{max-width:800px;margin:0 auto 26px;text-align:center;display:grid;gap:12px}
      body.public-home .stellar-app-preview-kicker{color:#a69bff;font:900 11px/1 'DM Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
      body.public-home .stellar-app-preview-head h2{margin:0;color:#f6f7fb;font-size:clamp(38px,5.8vw,72px);line-height:.98;letter-spacing:-.06em}
      body.public-home .stellar-app-preview-head p{margin:0 auto;max-width:700px;color:#aeb7c5;font-size:clamp(14px,1.5vw,17px);line-height:1.72}
      body.public-home .stellar-app-preview-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;align-items:stretch}
      body.public-home .stellar-app-preview-demo{padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:25px;background:linear-gradient(180deg,rgba(18,21,31,.96),rgba(10,12,18,.97));box-shadow:0 24px 80px rgba(0,0,0,.28)}
      body.public-home .stellar-app-preview-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.07);color:#818a99;font-size:12px;font-weight:800}
      body.public-home .stellar-app-dots{display:flex;gap:6px}.stellar-app-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.24)}
      body.public-home .stellar-app-chat{display:grid;gap:12px;padding-top:16px}.stellar-app-bubble{max-width:86%;padding:13px 14px;border-radius:18px;color:#e9edf6;font-size:13px;line-height:1.58}.stellar-app-bubble.user{margin-left:auto;background:rgba(139,124,246,.18);border:1px solid rgba(139,124,246,.28)}.stellar-app-bubble.ai{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}
      body.public-home .stellar-app-files{display:grid;gap:8px;margin-top:12px}.stellar-app-files span{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.035);color:#cdd3df;font-size:12px}.stellar-app-files b{color:#9ff0ca;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
      body.public-home .stellar-app-preview-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.stellar-app-preview-card{min-height:174px;padding:18px;border:1px solid rgba(255,255,255,.085);border-radius:21px;background:linear-gradient(180deg,rgba(255,255,255,.052),rgba(255,255,255,.018));display:grid;align-content:start;gap:8px}.stellar-app-preview-card span{color:#9f95ff;font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.stellar-app-preview-card h3{margin:0;color:#f5f7fb;font-size:19px;letter-spacing:-.03em}.stellar-app-preview-card p{margin:0;color:#a8b1c0;font-size:13px;line-height:1.62}
      body.public-home .stellar-app-preview-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:24px}.stellar-app-preview-actions a{min-height:46px;display:inline-flex;align-items:center;justify-content:center;padding:0 16px;border-radius:13px;border:1px solid rgba(255,255,255,.1);text-decoration:none;font-weight:900;font-size:13px;color:#f5f7fb}.stellar-app-preview-actions .primary{background:#f3f0ff;color:#101218;border-color:#f3f0ff}.stellar-app-preview-actions .secondary{background:rgba(255,255,255,.045)}
      @media(max-width:900px){body.public-home .stellar-app-preview-grid{grid-template-columns:1fr}.stellar-app-preview-cards{grid-template-columns:1fr 1fr!important}}
      @media(max-width:620px){body.public-home .stellar-app-preview-section{width:calc(100% - 24px);padding:52px 0}body.public-home .stellar-app-preview-cards{grid-template-columns:1fr!important}.stellar-app-bubble{max-width:100%}.stellar-app-preview-actions{display:grid}.stellar-app-preview-actions a{width:100%}}
    `;
    document.head.appendChild(style);

    const section = document.createElement('section');
    section.id = 'stellar-app-preview-section';
    section.className = 'stellar-app-preview-section';
    section.setAttribute('aria-labelledby', 'stellar-app-preview-title');
    section.innerHTML = `
      <div class="stellar-app-preview-head">
        <span class="stellar-app-preview-kicker">SEE THE APP BEFORE SIGNUP</span>
        <h2 id="stellar-app-preview-title">Show visitors what Stellar actually does.</h2>
        <p>People should land on the homepage and instantly understand the product: ask Stellar for code, fixes, websites, business tasks and AI workflows, then continue inside the app with visible credits and upgrade paths.</p>
      </div>
      <div class="stellar-app-preview-grid">
        <div class="stellar-app-preview-demo" aria-label="Stellar AI app preview">
          <div class="stellar-app-preview-top"><span>Stellar AI workspace</span><span class="stellar-app-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
          <div class="stellar-app-chat">
            <div class="stellar-app-bubble user">Build me a QBCore police job and explain where every file goes.</div>
            <div class="stellar-app-bubble ai">I’ll split it into client.lua, server.lua, config.lua and install steps, then show what to test before going live.</div>
            <div class="stellar-app-files"><span>client.lua <b>generated</b></span><span>server.lua <b>generated</b></span><span>config.lua <b>editable</b></span></div>
          </div>
        </div>
        <div class="stellar-app-preview-cards">
          <article class="stellar-app-preview-card"><span>01</span><h3>Start free</h3><p>Visitors can try the app before paying, which lowers friction and helps them trust the product.</p></article>
          <article class="stellar-app-preview-card"><span>02</span><h3>See credits</h3><p>Clear credits make the upgrade moment easier to understand instead of surprising users later.</p></article>
          <article class="stellar-app-preview-card"><span>03</span><h3>Open real tasks</h3><p>Buttons send users straight into prompts for scripts, bugs, websites and business work.</p></article>
          <article class="stellar-app-preview-card"><span>04</span><h3>Upgrade naturally</h3><p>Paid plans are positioned around more credits, stronger models and serious project capacity.</p></article>
        </div>
      </div>
      <div class="stellar-app-preview-actions">
        <a class="primary" href="/app?welcome=1">Open Stellar AI free</a>
        <a class="secondary" href="/script-generator-hub">Explore script tools</a>
        <a class="secondary" href="/plans">Compare plans</a>
      </div>
    `;

    const hero = document.querySelector('.oa2-hero') || document.querySelector('main > section') || document.querySelector('main');
    if (hero && hero.parentNode) hero.insertAdjacentElement('afterend', section);
  }

  function init() {
    cleanMetadata();
    injectRevenuePolishStyles();
    wireMenu();
    wireBuildPrompt();
    polishHero();
    injectAppPreviewSection();
    rewritePricingCopy();
    document.documentElement.dataset.stellarPricingLadder = 'v41';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();