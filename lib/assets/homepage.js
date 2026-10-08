(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const ANON_CLIENT_KEY = 'stellar-anonymous-preview-client-v1';
  const ANON_COUNT_KEY = 'stellar-anonymous-preview-count-v2';
  const ANON_PREVIEW_LIMIT = 3;

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

  function previewCount() {
    const count = Number.parseInt(safeGet(ANON_COUNT_KEY), 10);
    return Number.isFinite(count) && count > 0 ? Math.min(count, ANON_PREVIEW_LIMIT) : 0;
  }

  function previewLimitReached() {
    return previewCount() >= ANON_PREVIEW_LIMIT;
  }

  function setPreviewCount(count) {
    safeSet(ANON_COUNT_KEY, String(Math.max(0, Math.min(ANON_PREVIEW_LIMIT, Number(count) || 0))));
  }

  function gateToAccount(promptValue = '') {
    window.StellarTelemetry?.track?.('preview-gate-opened');
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
    let currentFilename = 'stellar-preview.lua';
    let busy = false;

    const setStatus = (message, state = '') => {
      status.textContent = message;
      status.dataset.state = state;
    };

    const updatePreviewState = (remaining = Math.max(0, ANON_PREVIEW_LIMIT - previewCount())) => {
      submit.textContent = '↑';
      if (remaining <= 0) {
        submit.setAttribute('aria-label', 'Open Stellar AI to continue');
        submit.dataset.gated = 'true';
        setStatus('3 free previews used today · open the full chat to continue.', 'gated');
        return;
      }
      submit.setAttribute('aria-label', 'Send message');
      delete submit.dataset.gated;
      setStatus(`${remaining} free preview${remaining === 1 ? '' : 's'} left today · no card required`, 'ready');
    };

    updatePreviewState();

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

      if (previewLimitReached()) {
        gateToAccount(prompt);
        return;
      }

      window.StellarTelemetry?.track?.('preview-started');
      busy = true;
      submit.disabled = true;
      submit.textContent = '…';
      submit.setAttribute('aria-label', 'Generating response');
      setStatus('Thinking…', 'loading');

      try {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ prompt, clientId: anonymousClientId() }),
        });
        const payload = await response.json().catch(() => ({}));

        if (response.status === 429 || payload?.code === 'ANON_PREVIEW_USED') {
          setPreviewCount(ANON_PREVIEW_LIMIT);
          updatePreviewState(0);
          gateToAccount(prompt);
          return;
        }
        if (!response.ok) throw new Error(payload?.error || 'Preview generation failed.');

        const generated = String(payload?.code || '').trim();
        if (!generated) throw new Error('Stellar returned an empty preview.');

        const remaining = Number.isFinite(Number(payload?.previewsRemaining))
          ? Math.max(0, Number(payload.previewsRemaining))
          : Math.max(0, ANON_PREVIEW_LIMIT - (previewCount() + 1));
        setPreviewCount(ANON_PREVIEW_LIMIT - remaining);
        currentFilename = String(payload?.filename || 'stellar-preview.lua').replace(/[^A-Za-z0-9._-]/g, '') || 'stellar-preview.lua';
        code.textContent = generated;
        if (meta) meta.textContent = (payload.framework || 'Game script') + ' · preview only';
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        updatePreviewState(remaining);
        window.StellarTrack?.('anonymous-preview-generated', 'homepage');
        window.StellarTelemetry?.track?.('preview-generated');
      } catch (error) {
        window.StellarTelemetry?.track?.('preview-error');
        submit.textContent = '↑';
        submit.setAttribute('aria-label', 'Send message');
        setStatus(error?.message || 'Could not generate a response. Try again.', 'error');
      } finally {
        busy = false;
        submit.disabled = false;
      }
    });

    input.addEventListener('input', () => input.setCustomValidity(''));
    download.addEventListener('click', () => {
      const generated = String(code.textContent || '').trim();
      if (!generated) return;
      const watermark = '-- Generated with Stellar AI — https://trystellarai.com\n';
      const contents = generated.startsWith(watermark) ? generated : watermark + generated;
      const blob = new Blob([contents + '\n'], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = currentFilename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      window.StellarTelemetry?.track?.('preview-downloaded');
    });
  }

  function keepPricingStateConsistent() {
    $$('.plan').forEach((plan) => {
      const name = String(plan.querySelector('h3,h2')?.textContent || '').toLowerCase();
      plan.classList.toggle('featured', name.includes('plus'));
    });
  }

  function installSideHomepageLayout() {
    // This homepage has accumulated legacy inline styles. Load the final
    // scoped responsive layout after parsing so those styles cannot hide it.
    if (!$('#stellar-home-side-layout-link')) {
      const stylesheet = document.createElement('link');
      stylesheet.id = 'stellar-home-side-layout-link';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/lib/assets/stellar-home-side-layout.css?v=20261008-side-layout';
      document.head.append(stylesheet);
    }

    // The existing desktop anchors are hidden on narrow screens. Provide
    // a keyboard-accessible native menu rather than hiding navigation.
    const topbar = $('.stellar-account-topbar');
    if (!topbar || $('#stellar-mobile-nav')) return;
    const menu = document.createElement('details');
    menu.id = 'stellar-mobile-nav';
    menu.className = 'stellar-mobile-nav';
    menu.innerHTML = `<summary aria-label="Open or close website navigation">Menu</summary>
      <nav class="stellar-mobile-nav-links" aria-label="Mobile website navigation">
        <a href="#work-tasks">Work</a>
        <a href="#capabilities">Features</a>
        <a href="#workspace">Workspace</a>
        <a href="#compare-ai">Compare</a>
        <a href="#plans">Plans</a>
        <a href="#other-businesses">Businesses</a>
        <a href="#questions">Questions</a>
      </nav>`;
    const auth = $('#stellar-auth-nav', topbar);
    topbar.insertBefore(menu, auth || null);
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) menu.open = false;
    });
    document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') menu.open = false;
    });
  }

  function init() {
    if (!document.body.classList.contains('public-home')) return;
    installSideHomepageLayout();
    wireMenu();
    wireAnonymousPreview();
    keepPricingStateConsistent();
    document.documentElement.dataset.stellarHomepageRuntime = 'v4';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
