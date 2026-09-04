(() => {
  'use strict';

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

  function detectCurrency(country = detectCountry()) { return COUNTRY_CURRENCY[country] || 'GBP'; }
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyCurrencyLabels, { once: true }); else applyCurrencyLabels();
})();
