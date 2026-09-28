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

  function rewritePricingCopy() { /* Pricing is rendered correctly in HTML; no global text mutation. */ }

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
