// Stellar public/app analytics — privacy-safe counters only.
(function () {
  const allowedHost = /(^|\.)trystellarai\.com$/.test(location.hostname) || /\.vercel\.app$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!allowedHost) return;

  const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';
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

  function injectPublicPolish() {
    if (document.getElementById('stellar-public-conversion-polish')) return;
    const style = document.createElement('style');
    style.id = 'stellar-public-conversion-polish';
    style.textContent = `
      html,body{min-width:320px;max-width:100%;overflow-x:hidden;}
      a,button,input,textarea,select{min-height:44px;}
      .public-home .site-header,.topbar{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}
      .public-home .oa2-hero,.public-home .hero{padding-inline:clamp(16px,4vw,34px)!important;}
      .public-home .oa2-hero h1,.public-home .hero h1{max-width:1050px;margin-inline:auto;text-wrap:balance;}
      .public-home .oa2-lead,.public-home .hero p{max-width:720px!important;text-wrap:balance;}
      .public-home .oa2-hero-actions,.public-home .hero-actions,.public-home .cta-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
      .public-home .oa2-hero-actions a,.public-home .hero-actions a,.public-home .cta-row a{min-height:46px;align-items:center;}
      .public-home .plans,.public-home .pricing-grid,.public-home .plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;align-items:stretch;}
      .public-home .plans .plan,.public-home .plan-card,.public-home .price-card{min-width:0;overflow:hidden;border-radius:22px;}
      .public-home .plans .plan .btn,.public-home .plan-card .btn,.public-home .price-card .btn{width:100%;}
      .public-home .section,.public-home section{scroll-margin-top:86px;}
      .public-home .faq details,.public-home details{border-radius:16px;overflow:hidden;}
      .public-home img{max-width:100%;height:auto;}
      @media(max-width:760px){
        .public-home .nav,.public-home .links,.topbar .links{gap:7px!important;overflow:auto!important;white-space:nowrap!important;padding-bottom:4px!important;}
        .public-home .oa2-hero,.public-home .hero{min-height:auto!important;padding-top:clamp(72px,13vh,112px)!important;padding-bottom:48px!important;}
        .public-home .oa2-hero h1,.public-home .hero h1{font-size:clamp(42px,12vw,62px)!important;line-height:1!important;letter-spacing:-.065em!important;}
        .public-home .oa2-composer{border-radius:22px!important;}
        .public-home .oa2-hero-proof,.public-home .pricing-trust{grid-template-columns:1fr!important;}
        .public-home .plans,.public-home .pricing-grid,.public-home .plan-grid{grid-template-columns:1fr!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeSupportLinks() {
    document.querySelectorAll('a[href="#"],button').forEach((node) => {
      const text = `${node.textContent || ''} ${node.getAttribute('aria-label') || ''}`.toLowerCase();
      if (!/(support|account help|refund|cancel|copy email)/.test(text)) return;
      if (node.tagName === 'A' && (!node.getAttribute('href') || node.getAttribute('href') === '#')) {
        node.setAttribute('href', `mailto:${SUPPORT_EMAIL}?subject=Stellar%20AI%20support`);
      }
    });
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
    injectPublicPolish();
    normalizeSupportLinks();
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
