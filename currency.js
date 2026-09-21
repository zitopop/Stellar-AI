(() => {
  'use strict';

  // Browser storage can be unavailable in private/restricted contexts. Keep every
  // caller behind a fail-safe wrapper so UI features degrade instead of crashing.
  if (typeof window.safeStorageGet !== 'function') {
    window.safeStorageGet = (key) => { try { return window.localStorage.getItem(key); } catch (_) { return null; } };
  }
  if (typeof window.safeStorageSet !== 'function') {
    window.safeStorageSet = (key, value) => { try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; } };
  }
  if (typeof window.safeStorageRemove !== 'function') {
    window.safeStorageRemove = (key) => { try { window.localStorage.removeItem(key); return true; } catch (_) { return false; } };
  }

  const COUNTRY_CURRENCY = {
    GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', CY: 'EUR', MT: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SI: 'EUR', SK: 'EUR', HR: 'EUR', IS: 'ISK', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', IN: 'INR', SG: 'SGD', HK: 'HKD', JP: 'JPY', KR: 'KRW', AE: 'AED', SA: 'SAR', ZA: 'ZAR', BR: 'BRL', MX: 'MXN'
  };
  const COUNTRY_TIMEZONE = { 'Europe/London': 'GB', 'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'Australia/Sydney': 'AU', 'Pacific/Auckland': 'NZ', 'Asia/Kolkata': 'IN', 'Asia/Singapore': 'SG', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Dubai': 'AE', 'Africa/Johannesburg': 'ZA', 'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX', 'Europe/Zurich': 'CH', 'Europe/Oslo': 'NO', 'Europe/Stockholm': 'SE', 'Europe/Copenhagen': 'DK', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU' };
  // Display-only defaults. Stripe remains the source of truth for payable amounts.
  const GBP_RATES = { GBP: 1, USD: 1.27, EUR: 1.17, CAD: 1.73, AUD: 1.94, NZD: 2.11, CHF: 1.13, NOK: 13.55, SEK: 13.65, DKK: 8.72, PLN: 5.02, CZK: 29.25, HUF: 455, RON: 5.82, BGN: 2.29, INR: 106, SGD: 1.71, HKD: 9.88, JPY: 188, KRW: 1_720, AED: 4.66, SAR: 4.76, ZAR: 23.0, BRL: 7.35, MXN: 22.0, ISK: 172 };
  const REGION_RE = /[-_](?<region>[A-Z]{2})$/;

  function detectCountry() {
    try {
      const language = String(navigator.language || '').replace('_', '-');
      const region = language.match(REGION_RE)?.groups?.region;
      if (region && COUNTRY_CURRENCY[region]) return region;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return COUNTRY_TIMEZONE[timeZone] || 'GB';
    } catch (_) { return 'GB'; }
  }

  function detectCurrency(country = detectCountry()) { return 'GBP'; }
  function roundAmount(value, currency) { return currency === 'JPY' || currency === 'KRW' || currency === 'HUF' ? Math.round(value) : Math.round(value * 100) / 100; }
  function formatLocalFromGbp(gbp, currency = detectCurrency()) {
    const amount = roundAmount(Number(gbp || 0) * (GBP_RATES[currency] || 1), currency);
    try { return new Intl.NumberFormat(navigator.language || 'en-GB', { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' || currency === 'KRW' || currency === 'HUF' ? 0 : 2 }).format(amount); }
    catch (_) { return `${currency} ${amount.toFixed(2)}`; }
  }
  // Stripe checkout is configured in GBP for the subscription price IDs.
  // Keep the visible plan price aligned with the payable amount; locale detection
  // remains available for checkout metadata and future regional price tables.
  function moneyLabel(gbp) {
    return `£${Number(gbp || 0).toFixed(2)}`;
  }
  function getCheckoutLocale() { const country = detectCountry(); return { country, currency: detectCurrency(country) }; }

  window.StellarCurrency = Object.freeze({ detectCountry, detectCurrency, formatLocalFromGbp, moneyLabel, getCheckoutLocale });

  function applyCurrencyLabels() {
    document.querySelectorAll('[data-gbp-price]').forEach((node) => {
      const gbp = Number(node.getAttribute('data-gbp-price'));
      if (Number.isFinite(gbp)) node.textContent = node.closest('.annual') ? `${moneyLabel(gbp)}/year · Save 30%` : moneyLabel(gbp);
    });
    document.querySelectorAll('.plan .price strong, #plan-card-free > div:nth-child(2), #plan-card-starter > div:nth-child(2), #plan-card-plus > div:nth-child(3), #plan-card-pro > div:nth-child(3)').forEach((node) => {
      if (node.hasAttribute('data-gbp-price')) return;
      const gbp = Number(String(node.textContent || '').replace(/[^0-9.]/g, ''));
      if (Number.isFinite(gbp)) node.textContent = moneyLabel(gbp);
    });
    document.querySelectorAll('.plan .annual, #plan-btn-starter-annual, #plan-btn-plus-annual, #plan-btn-pro-annual').forEach((node) => {
      if (node.hasAttribute('data-gbp-price')) return;
      const match = String(node.textContent || '').match(/£([0-9]+(?:\.[0-9]+)?)/);
      if (match) node.textContent = `${moneyLabel(Number(match[1]))}/year · Save 30%`;
    });
    document.querySelectorAll('[data-gbp-credit]').forEach((node) => {
      const gbp = Number(node.getAttribute('data-gbp-credit'));
      if (Number.isFinite(gbp)) node.textContent = `${moneyLabel(gbp)} credit`;
    });
    document.querySelectorAll('[data-country-currency]').forEach((node) => {
      const { country, currency } = getCheckoutLocale();
      node.textContent = `${country} · ${currency}`;
    });
  }

  function sidebarHelpText(label, control, sidebar) {
    const raw = String(label || '').replace(/^[+＋✦\\s]+/, '').trim();
    const key = raw.toLowerCase();

    if (control.classList.contains('sidebar-close')) {
      return sidebar.classList.contains('collapsed')
        ? 'Expand navigation — open the full sidebar'
        : 'Collapse navigation — shrink the sidebar to icons';
    }
    if (control.classList.contains('side-new')) {
      return 'New build — start a fresh Stellar AI chat';
    }
    if (/usage|credit|wallet|requests/.test(key)) {
      return `${raw || 'Usage'} — check requests, reset time and credit`;
    }
    if (/plan|upgrade|pricing|subscription/.test(key)) {
      return `${raw || 'Plans'} — view plans and manage your subscription`;
    }
    if (/setting|preference/.test(key)) {
      return `${raw || 'Settings'} — change app and account preferences`;
    }
    if (/model/.test(key)) {
      return `${raw || 'Models'} — choose or learn about available AI models`;
    }
    if (/chat|history|conversation/.test(key)) {
      return `${raw || 'Chats'} — open your saved conversations`;
    }
    if (/file|download|workspace/.test(key)) {
      return `${raw || 'Files'} — open your generated files and workspace`;
    }
    if (/home/.test(key)) {
      return `${raw || 'Home'} — return to your main Stellar workspace`;
    }
    if (/term|privacy|legal/.test(key)) {
      return `${raw || 'Legal'} — view terms and privacy information`;
    }
    if (/account|profile|sign in|login/.test(key)) {
      return `${raw || 'Account'} — manage your sign-in and account`;
    }
    return raw ? `${raw} — open this section` : 'Open this section';
  }

  function applySidebarRailLabels() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const controls = sidebar.querySelectorAll('.sidebar-close, .side-new, .stellar-sidebar-nav button');
    controls.forEach((control) => {
      let label = '';
      if (control.classList.contains('sidebar-close')) {
        label = control.getAttribute('aria-label') || (sidebar.classList.contains('collapsed') ? 'Expand navigation' : 'Collapse navigation');
      } else {
        label = control.getAttribute('aria-label') || control.getAttribute('title') || String(control.textContent || '').replace(/\\s+/g, ' ').trim();
      }
      label = label.replace(/^[+＋✦\\s]+/, '').trim();
      if (!label && control.classList.contains('side-new')) label = 'New build';

      const help = sidebarHelpText(label, control, sidebar);
      control.setAttribute('data-sidebar-label', help);
      if (label && !control.hasAttribute('aria-label')) control.setAttribute('aria-label', label);
    });
  }

  function watchSidebarRailLabels() {
    applySidebarRailLabels();
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.dataset.railLabelsWatching === 'true') return;
    sidebar.dataset.railLabelsWatching = 'true';
    const observer = new MutationObserver(() => applySidebarRailLabels());
    observer.observe(sidebar, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });
  }

  function ensureStylesheet(marker, href) {
    if (document.querySelector(`link[${marker}]`)) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    style.setAttribute(marker, 'true');
    document.head.appendChild(style);
  }

  function ensureScript(marker, src) {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.setAttribute(marker, 'true');
    document.head.appendChild(script);
  }

  function loadHomePresentation() {
    if (!/^\/(?:index\.html)?$/.test(location.pathname)) return;
    ensureStylesheet('data-stellar-home-v5', '/stellar-home-v5.css?v=2');
    ensureScript('data-stellar-home-v5-script', '/stellar-home-v5.js?v=2');
    ensureStylesheet('data-stellar-commerce-v1', '/stellar-commerce-v1.css?v=1');
    ensureScript('data-stellar-commerce-v1-script', '/stellar-commerce-v1.js?v=2');
  }

  function loadSettingsPresentation() {
    if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;
    // app.html owns the core Orbit runtime. currency.js only adds isolated
    // presentation/preferences so future features stay modular.
    ensureStylesheet('data-stellar-settings-v4', '/stellar-settings-v4.css?v=7');
    ensureStylesheet('data-stellar-home-chat-only', '/stellar-home-chat-only.css?v=6');
    ensureStylesheet('data-stellar-settings-extensions-style', '/stellar-settings-extensions.css?v=1');
    ensureScript('data-stellar-settings-extensions', '/stellar-settings-extensions.js?v=1');
    // The clean /app UI is owned by app.html. Do not dynamically reload the
    // legacy command dock or its CSS here, or cached clients can restore the
    // old Chat/Build/Fix/Deploy composer after the page has rendered.
  }

  loadHomePresentation();
  loadSettingsPresentation();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { applyCurrencyLabels(); watchSidebarRailLabels(); }, { once: true }); else { applyCurrencyLabels(); watchSidebarRailLabels(); }
})();
