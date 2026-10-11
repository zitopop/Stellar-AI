/* The marketing-page prompt is an editable handoff, never an auto-send.
 * Native GET /app?prompt=... works if scripts are disabled.
 * The app already reads and stages the query prompt before the user sends. */
(() => {
  'use strict';
  function initHeroPrompt() {
    const form = document.getElementById('stellar-hero-ask');
    if (!form || form.dataset.stellarPromptWired === 'true') return;
    const input = document.getElementById('stellar-hero-prompt');
    const modeInput = form.querySelector('input[name="mode"]');
    if (!input || !modeInput) return;
    form.dataset.stellarPromptWired = 'true';

    document.querySelectorAll('[data-hero-prompt]').forEach(link => {
      link.addEventListener('click', event => {
        const example = String(link.dataset.heroPrompt || '').trim().slice(0, 2000);
        if (!example) return; // The link still works without enhanced behavior.
        event.preventDefault();
        input.value = example;
        modeInput.value = link.dataset.heroMode === 'debug' ? 'debug' : 'general';
        input.setCustomValidity('');
        input.focus({ preventScroll: true });
        const end = input.value.length;
        try { input.setSelectionRange(end, end); } catch {}
        window.StellarTelemetry?.track?.('landing-hero-example-selected');
      });
    });

    input.addEventListener('input', () => {
      input.setCustomValidity('');
      if (!input.value.trim()) modeInput.value = 'general';
    });

    // A real server-side code preview is available below the illustrative demo.
    // Open its disclosure but never generate anything without user submission.
    const liveLink = document.getElementById('stellar-example-live');
    const livePreview = document.querySelector('#try-preview .developer-preview-collapse');
    if (livePreview) {
      if (window.location.hash === '#try-preview') livePreview.open = true;
      if (liveLink) {
        liveLink.addEventListener('click', () => {
          livePreview.open = true;
          window.StellarTelemetry?.track?.('landing-live-preview-opened');
        });
      }
    }

    form.addEventListener('submit', event => {
      const message = String(input.value || '').trim();
      if (!message) {
        event.preventDefault();
        input.setCustomValidity('Type a question to open Stellar.');
        input.reportValidity();
        input.focus();
        return;
      }
      // Keep a short editable draft, not an automatic chat request.
      input.value = message.slice(0, 2000);
      window.StellarTelemetry?.track?.('landing-hero-prompt-opened');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroPrompt, { once: true });
  } else {
    initHeroPrompt();
  }
})();
