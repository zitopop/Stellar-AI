(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const HOME_TITLE = 'Stellar AI — AI Workspace for Chat, Coding, Files & Business Tasks';
  const HOME_DESCRIPTION = 'Stellar AI helps you chat, code, research, work with files, connect plugins and manage business tasks in one clean AI workspace.';
  const HOME_KEYWORDS = 'Stellar AI, AI workspace, AI chat, AI coding assistant, AI files, AI plugins, business AI, productivity AI';

  function setMeta(selector, attr, value) {
    const node = $(selector);
    if (node) node.setAttribute(attr, value);
  }

  function cleanMetadata() {
    if (!document.body.classList.contains('public-home')) return;
    document.title = HOME_TITLE;
    setMeta('meta[name="description"]', 'content', HOME_DESCRIPTION);
    setMeta('meta[name="keywords"]', 'content', HOME_KEYWORDS);
    setMeta('meta[property="og:title"]', 'content', HOME_TITLE);
    setMeta('meta[property="og:description"]', 'content', HOME_DESCRIPTION);
    setMeta('meta[name="twitter:title"]', 'content', HOME_TITLE);
    setMeta('meta[name="twitter:description"]', 'content', HOME_DESCRIPTION);

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
    if (!document.body.classList.contains('public-home') || $('#stellar-revenue-polish-v39')) return;
    const style = document.createElement('style');
    style.id = 'stellar-revenue-polish-v39';
    style.textContent = `
      body.public-home .stellar-home-trustbar{width:min(820px,100%);margin:18px auto 0;display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
      body.public-home .stellar-home-trustbar span{display:inline-flex;align-items:center;min-height:32px;padding:0 11px;border:1px solid rgba(184,175,255,.20);border-radius:999px;background:rgba(255,255,255,.035);color:#c4cad7;font-size:11px;font-weight:760}
      body.public-home .stellar-credit-hero{width:min(780px,100%);margin:18px auto 0;padding:12px 14px;border:1px solid rgba(94,225,170,.18);border-radius:16px;background:linear-gradient(180deg,rgba(94,225,170,.075),rgba(255,255,255,.018));color:#cbd5df;font-size:12px;line-height:1.65;text-align:center}
      body.public-home .stellar-credit-hero strong{color:#eafbf4;font-weight:850}
      body.public-home :where(.oa2-jarvis-panel,.oa2-audience-grid article,.oa2-preview-shell,.plan,.faq-item,.workspace,.support-card,.guide-card){border-radius:24px!important;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015))!important;border-color:rgba(255,255,255,.09)!important}
      body.public-home .plan{position:relative!important;overflow:hidden!important;padding-top:26px!important}
      body.public-home .plan.featured:before{content:'Best value';position:absolute;right:14px;top:12px;z-index:1;padding:5px 9px;border-radius:999px;background:rgba(184,175,255,.14);border:1px solid rgba(184,175,255,.24);color:#dcd7ff;font-size:10px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
      body.public-home .stellar-plan-kicker{margin:8px 0 12px;color:#7ee2b8;font-size:11px;font-weight:850;letter-spacing:.02em;text-transform:uppercase}
      body.public-home .stellar-revenue-note{margin-top:12px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);color:#aeb7c8;font-size:12px;line-height:1.65}
      body.public-home .pricing-foot{border:1px solid rgba(255,255,255,.08)!important;border-radius:18px!important;background:rgba(255,255,255,.025)!important;padding:14px 16px!important}
      @media(max-width:640px){body.public-home .stellar-home-trustbar{display:grid;grid-template-columns:1fr;gap:7px}body.public-home .stellar-home-trustbar span{justify-content:center}.stellar-credit-hero{text-align:left}}
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
    if (note) note.textContent = 'Free daily credits · buy credit packs when you run low · paid plans unlock serious monthly capacity';
    const primary = $('.oa2-primary-action');
    if (primary) primary.textContent = 'Open Stellar AI';
    const secondary = $('.oa2-secondary-action');
    if (secondary) secondary.textContent = 'See plans';

    const actionAnchor = $('.oa2-hero-actions') || $('.hero-actions') || note;
    upsertAfter(actionAnchor, 'stellar-home-trustbar', 'stellar-home-trustbar', '<span>💬 Chat and code</span><span>💳 Clear credits</span><span>⚡ Upgrade when needed</span><span>🛡️ User-approved tools</span>');
    upsertAfter($('#stellar-home-trustbar'), 'stellar-credit-hero', 'stellar-credit-hero', '<strong>Credits should feel simple:</strong> free users get daily capacity, paid users get bigger monthly capacity, and credit packs keep work moving instantly when someone hits a limit.');
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
      if (heading) heading.insertAdjacentElement('afterend', kicker);

      const note = document.createElement('div');
      note.className = 'stellar-revenue-note';
      if (name.includes('free')) note.textContent = 'Good for testing Stellar AI. Show credits clearly so users understand when upgrading saves time.';
      else if (name.includes('starter')) note.textContent = 'A clean entry plan for people who want more monthly credits without jumping straight to Pro.';
      else if (name.includes('plus')) note.textContent = 'Position this as the main upgrade: more credits, better models and enough capacity for regular work.';
      else if (name.includes('pro')) note.textContent = 'For serious users who want maximum capacity, stronger tools and business-grade workflow.';
      else note.textContent = 'Credits and upgrade value should be obvious before checkout.';
      plan.appendChild(note);
    });

    const pricingFoot = $('.pricing-foot');
    if (pricingFoot && !pricingFoot.dataset.stellarCreditCopy) {
      pricingFoot.dataset.stellarCreditCopy = 'true';
      const p = document.createElement('p');
      p.textContent = 'Credits are separate from plan access: daily free credits help people try the app, paid monthly credits reward subscribers, and add-on credit packs let users continue immediately instead of waiting.';
      pricingFoot.appendChild(p);
    }
  }

  function init() {
    cleanMetadata();
    injectRevenuePolishStyles();
    wireMenu();
    wireBuildPrompt();
    polishHero();
    rewritePricingCopy();
    document.documentElement.dataset.stellarPricingLadder = 'v39';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
