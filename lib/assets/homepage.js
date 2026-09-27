(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
    form?.addEventListener('submit', event => {
      const value = prompt.value.trim().slice(0, 2000);
      if (!value) {
        event.preventDefault();
        prompt.setCustomValidity('Describe what you want to build.');
        prompt.reportValidity();
        return;
      }
      prompt.value = value;
    });
    prompt?.addEventListener('input', () => prompt.setCustomValidity(''));
  }

  const pricingReplacements = new Map([
    ['300 credits/day', '75 credits/day'],
    ['300 included credits/day', '75 included credits/day'],
    ['300 credits per day', '75 credits per day'],
    ['300 credits every day', '75 credits every day'],
    ['Free 300/day', 'Free 75/day'],
    ['300/day · 00:00 UK reset', '75/day · 00:00 UK reset'],
    ['300/day', '75/day'],
    ['1,500 credits/month', '5,000 credits/month'],
    ['1,500 included credits/month', '5,000 included credits/month'],
    ['1,500/month', '5,000/month'],
    ['5,000 credits/month', '15,000 credits/month'],
    ['5,000 included credits/month', '15,000 included credits/month'],
    ['5,000/month', '15,000/month'],
    ['5,000 credits + Comet', '15,000 credits + Comet'],
    ['20,000 credits/month', '50,000 credits/month'],
    ['20,000 included credits/month', '50,000 included credits/month'],
    ['20,000/month', '50,000/month'],
    ['20,000 credits + Nova', '50,000 credits + Nova'],
    ['up to 300 Star messages/month', 'up to 1,000 Star messages/month'],
    ['up to 500 Comet messages/month', 'up to 1,500 Comet messages/month'],
    ['up to 1,000 Nova messages/month', 'up to 2,500 Nova messages/month'],
    ['≈300 Star messages/month', '≈1,000 Star messages/month'],
    ['≈500 Comet messages/month', '≈1,500 Comet messages/month'],
    ['≈1,000 Nova messages/month', '≈2,500 Nova messages/month'],
    ['Up to 2,000 output tokens', 'Up to 1,800 output tokens'],
    ['Up to 3,500 output tokens', 'Up to 4,000 output tokens'],
    ['Up to 5,000 output tokens', 'Up to 6,500 output tokens'],
    ['Up to 8,000 output tokens', 'Up to 10,000 output tokens'],
  ]);

  const pricingPattern = new RegExp(Array.from(pricingReplacements.keys()).map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

  function rewriteTextNode(node) {
    const before = node.nodeValue;
    pricingPattern.lastIndex = 0;
    const after = before.replace(pricingPattern, match => pricingReplacements.get(match) || match);
    if (after !== before) node.nodeValue = after;
  }

  function rewritePricingCopy(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        pricingPattern.lastIndex = 0;
        return pricingPattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(rewriteTextNode);

    const starterValue = $('[data-plan="starter"] .plan-value span');
    if (starterValue) starterValue.textContent = '≈ up to 1,000 Star messages/month at the current 5-credit Star rate.';
    const plusValue = $('[data-plan="plus"] .plan-value span');
    if (plusValue) plusValue.textContent = '≈ up to 1,500 Comet messages/month at the current 10-credit Comet rate.';
    const proValue = $('[data-plan="pro"] .plan-value span');
    if (proValue) proValue.textContent = '≈ up to 2,500 Nova messages/month at the current 20-credit Nova rate.';
  }

  function polishHero() {
    if (!document.body.classList.contains('public-home')) return;
    const title = $('#hero-title');
    if (title) title.textContent = 'Get work done with AI you control.';
    const lead = $('.oa2-lead');
    if (lead) lead.textContent = 'Plan, write, build, support customers and improve your website from one clean workspace. Upgrade only when you need more capacity, stronger models or deeper project work.';
    const note = $('.oa2-start-note');
    if (note) note.textContent = 'Free to start · no card required · paid plans unlock real monthly capacity';
    const primary = $('.oa2-primary-action');
    if (primary) primary.textContent = 'Start free';
    const secondary = $('.oa2-secondary-action');
    if (secondary) secondary.textContent = 'View plans';
  }

  function init() {
    wireMenu();
    wireBuildPrompt();
    polishHero();
    rewritePricingCopy();
    document.documentElement.dataset.stellarPricingLadder = 'v29';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
