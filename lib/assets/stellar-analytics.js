// Stellar public/app analytics — privacy-safe counters only.
(function () {
  const allowedHost = /(^|\.)trystellarai\.com$/.test(location.hostname) || /\.vercel\.app$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!allowedHost) return;

  const pageMap = [
    [/\/app(?:\.html)?$/i, 'app-opened'],
    [/\/plugins(?:\.html)?$/i, 'plugin-opened'],
    [/\/support(?:\.html)?$/i, 'support-clicked'],
    [/\/thank-you(?:\.html)?$/i, 'thank-you-opened'],
    [/\/business-thank-you(?:\.html)?$/i, 'business-thank-you-opened'],
    [/\/ai-receptionist-thank-you(?:\.html)?$/i, 'ai-receptionist-thank-you-opened'],
    [/\/website-audit-thank-you(?:\.html)?$/i, 'website-audit-thank-you-opened'],
  ];

  function eventForPath(pathname) {
    const match = pageMap.find(([pattern]) => pattern.test(pathname));
    return match ? match[1] : 'homepage-opened';
  }

  function safeContext(value) {
    return String(value || 'general').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'general';
  }

  function track(event, context) {
    try {
      const body = JSON.stringify({ event, context: safeContext(context) });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon('/api/track-event', blob)) return;
      }
      fetch('/api/track-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch {}
  }

  window.StellarTrack = track;

  document.addEventListener('DOMContentLoaded', () => {
    track(eventForPath(location.pathname), document.body?.className || 'page');

    document.addEventListener('click', (event) => {
      const link = event.target?.closest?.('a,button');
      if (!link) return;
      const text = `${link.getAttribute('aria-label') || ''} ${link.textContent || ''} ${link.getAttribute('href') || ''}`.toLowerCase();
      if (/checkout|upgrade|starter|plus|pro|pricing|plan/.test(text)) track('plan-clicked', 'pricing');
      if (/stripe|payment|billing/.test(text)) track('checkout-clicked', 'billing');
      if (/support|help|refund|cancel/.test(text)) track('support-clicked', 'support');
      if (/plugin|github|vercel|gmail|drive|discord|shopify/.test(text)) track('plugin-opened', 'plugins');
    }, { passive: true });
  });
})();
