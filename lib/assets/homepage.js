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
    $$('a', menu).forEach((link) => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu(true);
    });
  }

  function wirePrompt() {
    const form = $('#build-form');
    const input = $('#build-prompt');
    if (!form || !input || form.dataset.stellarPromptWired === 'true') return;
    form.dataset.stellarPromptWired = 'true';
    form.addEventListener('submit', (event) => {
      const value = String(input.value || '').trim().slice(0, 2000);
      if (!value) {
        event.preventDefault();
        input.setCustomValidity('Type what you want Stellar AI to do.');
        input.reportValidity();
        return;
      }
      input.value = value;
    });
    input.addEventListener('input', () => input.setCustomValidity(''));
  }

  function keepPricingStateConsistent() {
    $$('.plan').forEach((plan) => {
      const name = String(plan.querySelector('h3,h2')?.textContent || '').toLowerCase();
      plan.classList.toggle('featured', name.includes('plus'));
    });
  }

  function init() {
    if (!document.body.classList.contains('public-home')) return;
    wireMenu();
    wirePrompt();
    keepPricingStateConsistent();
    document.documentElement.dataset.stellarHomepageRuntime = 'v2';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
