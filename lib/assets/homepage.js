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
    cleanMetadata();
    wireMenu();
    wireBuildPrompt();
    polishHero();
    rewritePricingCopy();
    document.documentElement.dataset.stellarPricingLadder = 'v30';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
