// Stellar public analytics — privacy-safe counters only.
// This file deliberately does not rewrite product UI or pricing copy.
(function () {
  const allowedHost = /(^|\.)trystellarai\.com$/.test(location.hostname)
    || /\.vercel\.app$/.test(location.hostname)
    || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!allowedHost) return;

  const METRICS_OPTOUT_KEY = 'stellar_metrics_optout';
  const pageMap = [
    [/\/app(?:\.html)?$/i, 'app-opened'],
    [/\/plugins(?:\.html)?$/i, 'plugin-opened'],
    [/\/support(?:\.html)?$/i, 'support-clicked'],
    [/\/thank-you(?:\.html)?$/i, 'thank-you-opened'],
    [/\/business-thank-you(?:\.html)?$/i, 'business-thank-you-opened'],
    [/\/ai-receptionist-thank-you(?:\.html)?$/i, 'ai-receptionist-thank-you-opened'],
    [/\/website-audit-thank-you(?:\.html)?$/i, 'website-audit-thank-you-opened']
  ];

  function metricsAllowed() {
    try { return localStorage.getItem(METRICS_OPTOUT_KEY) !== '1'; } catch { return true; }
  }

  function safeContext(value) {
    return String(value || 'general').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'general';
  }

  function eventForPath(pathname) {
    const match = pageMap.find(([pattern]) => pattern.test(pathname));
    return match ? match[1] : 'homepage-opened';
  }

  function track(event, context = 'general') {
    if (!metricsAllowed()) return false;
    try {
      const body = JSON.stringify({ event, context: safeContext(context) });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon('/api/track-event', blob)) return true;
      }
      fetch('/api/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin'
      }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  function trackRetentionSignals() {
    if (!/\/app(?:\.html)?$/i.test(location.pathname)) return;
    try {
      const now = Date.now();
      const day = new Date().toISOString().slice(0, 10);
      const lastDay = localStorage.getItem('stellar_metrics_active_day');
      if (lastDay !== day) {
        localStorage.setItem('stellar_metrics_active_day', day);
        track('active-day', 'app');
      }
      const lastSession = Number(localStorage.getItem('stellar_metrics_last_session_at') || 0);
      if (!lastSession || now - lastSession >= 30 * 60 * 1000) {
        track('workspace-session-started', lastSession ? 'returning' : 'first');
      }
      localStorage.setItem('stellar_metrics_last_session_at', String(now));
    } catch {}
  }

  window.StellarTrack = track;

  document.addEventListener('DOMContentLoaded', () => {
    track(eventForPath(location.pathname), document.body?.className || 'page');
    trackRetentionSignals();

    document.addEventListener('click', (event) => {
      const control = event.target?.closest?.('a,button');
      if (!control) return;
      const text = `${control.getAttribute('aria-label') || ''} ${control.textContent || ''} ${control.getAttribute('href') || ''}`.toLowerCase();
      if (/checkout|upgrade|starter|plus|pro|pricing|plan/.test(text)) track('plan-clicked', 'pricing');
      if (/stripe|payment|billing/.test(text)) track('checkout-clicked', 'billing');
      if (/support|help|refund|cancel/.test(text)) track('support-clicked', 'support');
      if (/plugin|github|vercel|gmail|drive|discord|shopify/.test(text)) track('plugin-opened', 'plugins');
      if (/ai receptionist|website audit|business service/.test(text)) track('business-service-clicked', 'business');
    }, { passive: true });
  });
})();
