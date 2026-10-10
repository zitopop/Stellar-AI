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
    const toggle = $('.menu-toggle');
    const menu = $('#site-nav');
    if (!toggle || !menu) return;
    const wasOpen = menu.classList.contains('is-open');
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.textContent = 'Menu ☰';
    if (restoreFocus && wasOpen) toggle.focus();
  }

  function wireMenu() {
    // Match the actual public homepage header and the responsive CSS rule
    // .site-nav.is-open. The older #nav-toggle/#mobile-nav markup was retired.
    const toggle = $('.menu-toggle');
    const menu = $('#site-nav');
    if (!toggle || !menu || toggle.dataset.stellarMenuWired === 'true') return;
    toggle.dataset.stellarMenuWired = 'true';
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      toggle.textContent = open ? 'Close ×' : 'Menu ☰';
    });
    Array.from(menu.querySelectorAll('a')).forEach((link) => link.addEventListener('click', () => closeMenu()));
    document.addEventListener('click', (event) => {
      if (menu.classList.contains('is-open') && !menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu(true);
    });
    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 801px)').matches) closeMenu();
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

  const ANON_COUNT_TIME_KEY = 'stellar-anonymous-preview-started-at-v1';
  function previewCount() {
    const started = Number(safeGet(ANON_COUNT_TIME_KEY));
    if (!started || Date.now() - started >= 24 * 60 * 60 * 1000 || started > Date.now()) {
      safeSet(ANON_COUNT_KEY, '0');
      safeSet(ANON_COUNT_TIME_KEY, '');
      return 0;
    }
    const count = Number.parseInt(safeGet(ANON_COUNT_KEY), 10);
    return Number.isFinite(count) && count > 0 ? Math.min(count, ANON_PREVIEW_LIMIT) : 0;
  }

  function previewLimitReached() {
    return previewCount() >= ANON_PREVIEW_LIMIT;
  }

  function setPreviewCount(count) {
    if (count > 0 && !safeGet(ANON_COUNT_TIME_KEY)) safeSet(ANON_COUNT_TIME_KEY, String(Date.now()));
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

    const fallbackExtension = (languageValue, frameworkValue) => {
      const language = `${languageValue || ''} ${frameworkValue || ''}`.toLowerCase();
      if (language.includes('typescript')) return '.ts';
      if (language.includes('javascript') || language.includes('node')) return '.js';
      if (language.includes('python')) return '.py';
      if (language.includes('json')) return '.json';
      if (language.includes('html')) return '.html';
      if (language.includes('css')) return '.css';
      return '.lua';
    };
    let busy = false;

    const setStatus = (message, state = '') => {
      status.textContent = message;
      status.dataset.state = state;
    };

    const updatePreviewState = (remaining = Math.max(0, ANON_PREVIEW_LIMIT - previewCount())) => {
      submit.textContent = 'Generate preview';
      if (remaining <= 0) {
        submit.setAttribute('aria-label', 'Open Stellar AI to continue after three previews');
        submit.dataset.gated = 'true';
        setStatus('3 previews used · open the full chat to continue.', 'gated');
        return;
      }
      submit.setAttribute('aria-label', 'Generate a free script preview');
      delete submit.dataset.gated;
      setStatus(`${remaining} free preview${remaining === 1 ? '' : 's'} left · no card required`, 'ready');
    };

    updatePreviewState();

    // Examples prepare the real preview form, but never spend an anonymous
    // generation or make a network request without the visitor pressing Generate.
    document.querySelectorAll('[data-preview-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        if (busy) return;
        const example = String(button.dataset.previewPrompt || '').trim().slice(0, 800);
        if (!example) return;
        input.value = example;
        input.setCustomValidity('');
        result.hidden = true;
        input.focus({ preventScroll: true });
        window.StellarTelemetry?.track?.('preview-example-selected');
      });
    });

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
      submit.textContent = 'Generating…';
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
        const returnedFilename = String(payload?.filename || '').replace(/[^A-Za-z0-9._-]/g, '');
        currentFilename = returnedFilename || `stellar-preview${fallbackExtension(payload?.language, payload?.framework)}`;
        code.textContent = generated;
        if (meta) meta.textContent = (payload.framework || 'Code') + ' · preview only';
        result.hidden = false;
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        updatePreviewState(remaining);
        window.StellarTrack?.('anonymous-preview-generated', 'homepage');
        window.StellarTelemetry?.track?.('preview-generated');
      } catch (error) {
        window.StellarTelemetry?.track?.('preview-error');
        submit.textContent = 'Generate preview';
        submit.setAttribute('aria-label', 'Generate a free script preview');
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
      // Preserve the returned code: comment syntax varies by language.
      const contents = generated;
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
    if (document.body.dataset.layout !== 'lean-v1') installSideHomepageLayout();
    wireMenu();
    wireAnonymousPreview();
    keepPricingStateConsistent();
    document.documentElement.dataset.stellarHomepageRuntime = 'v5';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
