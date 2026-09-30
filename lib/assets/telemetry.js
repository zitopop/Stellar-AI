// Stellar client telemetry — analytics only.
// Product layout, pricing and account UI must remain owned by the page itself.
(() => {
  const endpoint = '/api/client-metric';
  const allowed = new Set([
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error',
    'usage-panel-opened','plans-panel-opened','upgrade-from-usage','business-service-clicked'
  ]);
  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';

  function metricsAllowed() {
    try { return localStorage.getItem(METRICS_OPTOUT_KEY) !== '1'; } catch { return true; }
  }

  function track(event) {
    if (!metricsAllowed()) return false;
    const name = String(event || '').trim().toLowerCase();
    if (!allowed.has(name)) return false;
    const body = JSON.stringify({ event: name });
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

  window.StellarTelemetry = Object.freeze({ track });

  if (location.pathname === '/' || location.pathname === '/index.html') track('landing-view');
  if (location.pathname === '/app' || location.pathname === '/app.html') track('app-view');

  document.addEventListener('click', (event) => {
    const control = event.target?.closest?.('a[href],button');
    if (!control) return;
    const href = control.getAttribute?.('href') || '';
    const text = `${control.textContent || ''} ${control.getAttribute?.('aria-label') || ''} ${href}`.toLowerCase();

    if (/ai receptionist|website audit|business service/.test(text)) track('business-service-clicked');
    if (/upgrade|starter|plus|pro|pricing|plan/.test(text)) track('upgrade-intent');

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

  addEventListener('error', () => track('client-error'));
  addEventListener('unhandledrejection', () => track('client-error'));
})();
