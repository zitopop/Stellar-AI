(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const ANON_CLIENT_KEY = 'stellar-anonymous-preview-client-v1';
  const ANON_USED_KEY = 'stellar-anonymous-preview-used-v1';

  function safeGet(key) {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
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
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu(true);
    });
  }

  function anonymousClientId() {
    const existing = safeGet(ANON_CLIENT_KEY);
    if (/^[A-Za-z0-9_-]{12,80}$/.test(existing)) return existing;
    const random = globalThis.crypto?.randomUUID?.().replace(/[^A-Za-z0-9_-]/g, '')
      || Math.random().toString(36).slice(2) + Date.now().toString(36);
    const id = ('preview_' + random).slice(0, 80);
    safeSet(ANON_CLIENT_KEY, id);
    return id;
  }

  function previewWasUsed() {
    return safeGet(ANON_USED_KEY) === '1';
  }

  function gateToAccount(promptValue = '') {
    const params = new URLSearchParams({ auth: 'preview', source: 'homepage-preview' });
    const prompt = String(promptValue || '').trim().slice(0, 800);
    if (prompt) params.set('prompt', prompt);
    location.assign('/app?' + params.toString());
  }

  function wireAnonymousPreview() {
    const form = $('#anonymous-preview-form');
    const input = $('#anonymous-preview-prompt');
    const submit = $('#anonymous-preview-submit');
    const status = $('#anonymous-preview-status');
    const result = $('#anonymous-preview-result');
    const code = $('#anonymous-preview-code');
    const meta = $('#anonymous-preview-meta');
    const download = $('#anonymous-preview-download');
    if (!form || !input || !submit || !status || !result || !code || !download) return;

    let currentPrompt = '';
    let busy = false;

    const setStatus = (message, state = '') => {
      status.textContent = message;
      status.dataset.state = state;
    };

    const showUsedState = () => {
      submit.textContent = 'Create a free account to generate again';
      submit.dataset.gated = 'true';
      setStatus('Preview used. Create a free account to keep generating and download files.', 'gated');
    };

    if (previewWasUsed()) showUsedState();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const prompt = String(input.value || '').trim().slice(0, 800);
      if (prompt.length < 10) {
        input.setCustomValidity('Describe the script you want in a little more detail.');
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      currentPrompt = prompt;

      if (previewWasUsed()) {
        gateToAccount(prompt);
        return;
      }

      busy = true;
      submit.disabled = true;
      submit.textContent = 'Generating preview…';
      setStatus('Generating one server-side preview. No account required.', 'loading');

      try {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ prompt, clientId: anonymousClientId() }),
        });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 429 || payload?.code === 'ANON_PREVIEW_USED') {
          safeSet(ANON_USED_KEY, '1');
          showUsedState();
          gateToAccount(prompt);
          return;
        }
        if (!response.ok) throw new Error(payload?.error || 'Preview generation failed.');

        const generated = String(payload?.code || '').trim();
        if (!generated) throw new Error('Stellar returned an empty preview.');

        safeSet(ANON_USED_KEY, '1');
        code.textContent = generated;
        if (meta) meta.textContent = (payload.framework || 'Game script') + ' · preview only';
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        showUsedState();
        window.StellarTrack?.('anonymous-preview-generated', 'homepage');
      } catch (error) {
        submit.textContent = 'Generate free preview';
        setStatus(error?.message || 'Preview generation failed. Try again.', 'error');
      } finally {
        busy = false;
        submit.disabled = false;
      }
    });

    input.addEventListener('input', () => input.setCustomValidity(''));
    download.addEventListener('click', () => gateToAccount(currentPrompt || input.value));
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
    wireAnonymousPreview();
    keepPricingStateConsistent();
    document.documentElement.dataset.stellarHomepageRuntime = 'v3';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
