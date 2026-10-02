// Stellar client telemetry — analytics only.
// Product layout, pricing and account UI must remain owned by the page itself.
(() => {
  const endpoint = '/api/client-metric';
  const allowed = new Set([
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error',
    'usage-panel-opened','plans-panel-opened','upgrade-from-usage','business-service-clicked',
    'pricing-view','plan-free-selected','plan-starter-selected','plan-plus-selected','plan-pro-selected'
  ]);
  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';
  const ATTRIBUTION_KEY = 'stellar_acquisition_source';
  const SOURCES = new Set(['direct','github','cfx','builtbybit','google','discord','other']);

  function sourceFromReferrer() {
    try {
      const host = new URL(document.referrer || '').hostname.toLowerCase();
      if (!host) return 'direct';
      if (host === 'github.com' || host.endsWith('.github.com')) return 'github';
      if (host === 'forum.cfx.re' || host.endsWith('.cfx.re')) return 'cfx';
      if (host === 'builtbybit.com' || host.endsWith('.builtbybit.com')) return 'builtbybit';
      if (host === 'google.com' || host.endsWith('.google.com') || /^www\.google\.[a-z.]+$/.test(host)) return 'google';
      if (host === 'discord.com' || host === 'discord.gg' || host.endsWith('.discord.com')) return 'discord';
      return host === location.hostname ? 'direct' : 'other';
    } catch {
      return 'direct';
    }
  }

  function attributionSource() {
    let source = '';
    try {
      const requested = String(new URLSearchParams(location.search).get('utm_source') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (SOURCES.has(requested)) source = requested;
      if (!source) {
        const stored = String(localStorage.getItem(ATTRIBUTION_KEY) || '').toLowerCase();
        if (SOURCES.has(stored)) source = stored;
      }
      if (!source) source = sourceFromReferrer();
      if (!SOURCES.has(source)) source = 'other';
      localStorage.setItem(ATTRIBUTION_KEY, source);
    } catch {
      source = sourceFromReferrer();
    }
    return SOURCES.has(source) ? source : 'other';
  }

  function metricsAllowed() {
    try { return localStorage.getItem(METRICS_OPTOUT_KEY) !== '1'; } catch { return true; }
  }

  function track(event) {
    if (!metricsAllowed()) return false;
    const name = String(event || '').trim().toLowerCase();
    if (!allowed.has(name)) return false;
    const body = JSON.stringify({ event: name, source: attributionSource() });
    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
        if (ok) return true;
      }
    } catch {}
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin'
      }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  window.StellarTelemetry = Object.freeze({ track, attributionSource });

  if (location.pathname === '/' || location.pathname === '/index.html') track('landing-view');
  if (location.pathname === '/app' || location.pathname === '/app.html') track('app-view');

  document.addEventListener('click', (event) => {
    const control = event.target?.closest?.('a[href],button');
    if (!control) return;
    const href = control.getAttribute?.('href') || '';
    const text = `${control.textContent || ''} ${control.getAttribute?.('aria-label') || ''} ${href}`.toLowerCase();

    if (/ai receptionist|website audit|business service/.test(text)) track('business-service-clicked');
    if (/upgrade|starter|plus|pro|pricing|plan/.test(text)) track('upgrade-intent');
    const planCard = control.closest?.('[data-plan]');
    const planName = String(planCard?.getAttribute?.('data-plan') || '').toLowerCase();
    if (['free','starter','plus','pro'].includes(planName)) track(`plan-${planName}-selected`);

    if (!href) return;
    let url;
    try { url = new URL(href, location.href); } catch { return; }
    if (url.hostname === 'buy.stripe.com' || url.hostname === 'checkout.stripe.com') {
      track('checkout-open');
      return;
    }
    if (url.origin === location.origin && (url.pathname === '/app' || url.pathname === '/app.html')) {
      track(url.searchParams.has('upgrade') ? 'upgrade-intent' : 'app-open-cta');
    }
  }, { passive: true });

  const pricing = document.getElementById('plans');
  if (pricing && 'IntersectionObserver' in window) {
    let pricingSeen = false;
    const observer = new IntersectionObserver((entries) => {
      if (pricingSeen || !entries.some(entry => entry.isIntersecting)) return;
      pricingSeen = true;
      track('pricing-view');
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(pricing);
  }

  addEventListener('error', () => track('client-error'));
  addEventListener('unhandledrejection', () => track('client-error'));
})();
