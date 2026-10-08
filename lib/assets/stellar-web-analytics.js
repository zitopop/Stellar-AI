/* Privacy-respecting Vercel Web Analytics bootstrap for static Stellar pages. */
(() => {
  'use strict';
  const host = String(location.hostname || '').toLowerCase();
  if (!/(^|\.)trystellarai\.com$/.test(host) && !/\.vercel\.app$/.test(host)) return;

  // Do not override the site's existing optional metrics opt-out or GPC.
  try {
    if (localStorage.getItem('stellar_metrics_optout') === '1') return;
  } catch {
    return; // Fail closed if the opt-out state cannot be read.
  }
  if (navigator.globalPrivacyControl === true) return;
  if (document.querySelector('script[data-stellar-vercel-analytics], script[src="/_vercel/insights/script.js"]')) return;

  window.va = window.va || function (...args) {
    (window.vaq = window.vaq || []).push(args);
  };
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  script.dataset.stellarVercelAnalytics = 'true';
  document.head.appendChild(script);
})();
