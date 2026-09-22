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

  function installVoicePickerPolish() {
    if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;
    if (window.__stellarVoicePickerPolishInstalled) return;
    window.__stellarVoicePickerPolishInstalled = true;

    const LANGUAGE_KEY = 'stellar.voice.language';
    let filterTimer = 0;
    let voiceCatalog = [];

    const normalizeLocale = (value) => String(value || '').trim().replace('_','-');

    const localeFromVoiceText = (value) => {
      const text = String(value || '');
      const exact = text.match(/\b([a-z]{2,3}(?:[-_][A-Z]{2})?)\b(?=\s*(?:·|$))/i);
      if (exact?.[1]) return normalizeLocale(exact[1]);
      const fallback = text.match(/\b([a-z]{2,3}[-_][A-Z]{2})\b/i);
      return fallback?.[1] ? normalizeLocale(fallback[1]) : '';
    };

    const voiceBase = (locale) => normalizeLocale(locale).split('-')[0].toLowerCase();

    const selectedLanguage = () => {
      const saved = window.safeStorageGet?.(LANGUAGE_KEY) || '';
      return saved || 'auto';
    };

    const resolvedRecognitionLanguage = () => {
      const selected = selectedLanguage();
      if (selected !== 'auto') return normalizeLocale(selected);
      return normalizeLocale(navigator.language || document.documentElement.lang || 'en-GB');
    };

    window.StellarVoiceLanguage = Object.freeze({
      get: selectedLanguage,
      resolved: resolvedRecognitionLanguage,
    });

    const patchRecognitionLanguage = () => {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const proto = Recognition?.prototype;
      if (!proto || typeof proto.start !== 'function' || proto.__stellarLanguagePatched) return;

      const nativeStart = proto.start;
      Object.defineProperty(proto, '__stellarLanguagePatched', {
        value:true,
        configurable:true,
      });

      proto.start = function(...args) {
        try {
          const locale = resolvedRecognitionLanguage();
          if (locale) this.lang = locale;
        } catch {}
        return nativeStart.apply(this, args);
      };
    };

    const friendlyLanguageName = (locale) => {
      const normalized = normalizeLocale(locale);
      try {
        const display = new Intl.DisplayNames([navigator.language || 'en-GB'], { type:'language' });
        return display.of(normalized) || normalized;
      } catch {
        return normalized;
      }
    };

    const captureVoiceCatalog = (select) => {
      Array.from(select?.options || []).forEach((option) => {
        const item = {
          value:String(option.value ?? ''),
          text:String(option.textContent || '').trim(),
          locale:localeFromVoiceText(option.textContent),
          disabled:Boolean(option.disabled),
        };
        const exists = voiceCatalog.some((entry) => entry.value === item.value && entry.text === item.text);
        if (!exists) voiceCatalog.push(item);
      });
    };

    const availableLocales = () => {
      const unique = [];
      voiceCatalog.forEach((voice) => {
        const locale = normalizeLocale(voice.locale);
        if (!locale || unique.some((item) => item.toLowerCase() === locale.toLowerCase())) return;
        unique.push(locale);
      });

      const browserLocale = normalizeLocale(navigator.language || 'en-GB').toLowerCase();
      const score = (locale) => {
        const lower = locale.toLowerCase();
        let value = 0;
        if (lower === browserLocale) value += 1000;
        if (lower === 'en-gb') value += 700;
        else if (lower.startsWith('en-')) value += 500;
        if (['es-es','fr-fr','de-de','it-it','pt-br','nl-nl','pl-pl','ja-jp','ko-kr','hi-in','zh-cn'].includes(lower)) value += 200;
        return value;
      };

      return unique.sort((a,b) => score(b) - score(a) || friendlyLanguageName(a).localeCompare(friendlyLanguageName(b)));
    };

    const ensureLanguageControl = (voiceSelect) => {
      if (!voiceSelect) return null;
      let languageSelect = document.getElementById('voice-language-select');
      if (!languageSelect) {
        const row = document.createElement('div');
        row.className = 'set-item stellar-voice-language-row';
        row.innerHTML = '<div class="set-key"><span>Voice language</span><small>Used for listening and spoken replies.</small></div><div class="set-val"><select id="voice-language-select" aria-label="Voice language"></select></div>';

        const voiceRow = voiceSelect.closest('.set-item');
        if (voiceRow?.parentElement) voiceRow.parentElement.insertBefore(row, voiceRow);
        else voiceSelect.parentElement?.insertBefore(row, voiceSelect);

        languageSelect = row.querySelector('#voice-language-select');
        languageSelect?.addEventListener('change', () => {
          const value = languageSelect.value || 'auto';
          window.safeStorageSet?.(LANGUAGE_KEY, value);
          renderVoiceChoices();
        });
      }

      if (!languageSelect) return null;

      const selected = selectedLanguage();
      const locales = availableLocales();
      const existingSignature = Array.from(languageSelect.options).map((option) => option.value).join('|');
      const desiredSignature = ['auto', ...locales].join('|');

      if (existingSignature !== desiredSignature) {
        languageSelect.replaceChildren();
        const auto = document.createElement('option');
        auto.value = 'auto';
        auto.textContent = 'Auto · device language';
        languageSelect.appendChild(auto);

        locales.forEach((locale) => {
          const option = document.createElement('option');
          option.value = locale;
          option.textContent = friendlyLanguageName(locale);
          languageSelect.appendChild(option);
        });
      }

      const hasSaved = Array.from(languageSelect.options).some((option) => option.value === selected);
      languageSelect.value = hasSaved ? selected : 'auto';
      languageSelect.title = 'Choose the language Stellar listens and speaks in';
      return languageSelect;
    };

    const voiceRank = (voice, selectedValue, requestedLocale) => {
      const text = String(voice?.text || '').toLowerCase();
      const locale = normalizeLocale(voice?.locale).toLowerCase();
      const requested = normalizeLocale(requestedLocale).toLowerCase();
      let score = 0;

      if (voice?.value === selectedValue) score += 1000;
      if (/system default/.test(text)) score += 900;
      if (requested && locale === requested) score += 420;
      else if (requested && voiceBase(locale) === voiceBase(requested)) score += 280;
      if (/natural|neural|premium|enhanced/.test(text)) score += 100;
      if (/microsoft|google/.test(text)) score += 25;
      return score;
    };

    const renderVoiceChoices = () => {
      const select = document.getElementById('voice-select');
      if (!select || select.dataset.stellarFiltering === 'true') return;

      captureVoiceCatalog(select);
      const languageSelect = ensureLanguageControl(select);
      if (!voiceCatalog.length) return;

      const requested = languageSelect?.value || selectedLanguage();
      const resolved = requested === 'auto'
        ? normalizeLocale(navigator.language || document.documentElement.lang || 'en-GB')
        : normalizeLocale(requested);
      const requestedBase = voiceBase(resolved);
      const previousValue = select.value;

      const system = voiceCatalog.find((voice) => /system default/i.test(voice.text));
      const exact = voiceCatalog.filter((voice) => normalizeLocale(voice.locale).toLowerCase() === resolved.toLowerCase());
      const sameLanguage = voiceCatalog.filter((voice) =>
        voice.locale &&
        voiceBase(voice.locale) === requestedBase &&
        !exact.includes(voice)
      );

      let candidates = [...exact, ...sameLanguage]
        .sort((a,b) => voiceRank(b, previousValue, resolved) - voiceRank(a, previousValue, resolved));

      if (requested === 'auto' && system) candidates.unshift(system);
      if (!candidates.length && system) candidates = [system];

      const keep = [];
      candidates.forEach((voice) => {
        if (keep.length >= 8) return;
        if (keep.some((entry) => entry.value === voice.value && entry.text === voice.text)) return;
        keep.push(voice);
      });

      if (!keep.length) return;

      select.dataset.stellarFiltering = 'true';
      try {
        const previousStillAvailable = keep.some((voice) => voice.value === previousValue);
        select.replaceChildren();

        keep.forEach((voice) => {
          const option = document.createElement('option');
          option.value = voice.value;
          option.textContent = voice.text;
          option.disabled = voice.disabled;
          select.appendChild(option);
        });

        if (previousStillAvailable) {
          select.value = previousValue;
        } else {
          select.value = keep[0].value;
          select.dispatchEvent(new Event('change', { bubbles:true }));
        }

        select.dataset.stellarVoiceCount = String(select.options.length);
        const friendly = requested === 'auto' ? 'your device language' : friendlyLanguageName(resolved);
        select.setAttribute('aria-label', 'Stellar voice for ' + friendly);
        select.title = 'Voices for ' + friendly;
      } finally {
        select.dataset.stellarFiltering = 'false';
      }
    };

    const scheduleFilter = () => {
      window.clearTimeout(filterTimer);
      filterTimer = window.setTimeout(renderVoiceChoices, 50);
    };

    patchRecognitionLanguage();
    scheduleFilter();

    const bodyObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) =>
        Array.from(mutation.addedNodes || []).some((node) =>
          node?.id === 'voice-select' ||
          node?.querySelector?.('#voice-select') ||
          node?.id === 'voice-language-select'
        ) ||
        mutation.target?.id === 'voice-select'
      )) scheduleFilter();
    });
    bodyObserver.observe(document.body, { childList:true, subtree:true });

    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.addEventListener('voiceschanged', scheduleFilter); } catch {}
    }

    document.addEventListener('click', (event) => {
      if (event.target?.closest?.('[data-tab="voice"], [data-panel-target="voice"], [data-settings-tab="voice"]')) {
        window.setTimeout(scheduleFilter, 60);
      }
    }, true);
  }

  function installServiceWorkerUpdateRefresh() {
    if (!('serviceWorker' in navigator)) return;
    if (window.__stellarSwRefreshInstalled) return;
    window.__stellarSwRefreshInstalled = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event?.data?.type !== 'STELLAR_SW_UPDATED') return;
      const version = String(event.data.version || 'updated');
      const seenKey = 'stellar-sw-seen:' + version;
      try {
        if (sessionStorage.getItem(seenKey) === '1') return;
        sessionStorage.setItem(seenKey, '1');
      } catch {}

      if (/^\/app(?:\.html)?\/?$/.test(location.pathname)) {
        window.setTimeout(() => location.reload(), 120);
      }
    });

    navigator.serviceWorker.getRegistration?.().then((registration) => {
      registration?.update?.().catch?.(() => {});
    }).catch(() => {});
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
    ensureStylesheet('data-stellar-settings-v4', '/stellar-settings-v4.css?v=10');
    ensureStylesheet('data-stellar-home-chat-only', '/stellar-home-chat-only.css?v=13');
    ensureStylesheet('data-stellar-settings-extensions-style', '/stellar-settings-extensions.css?v=1');
    ensureScript('data-stellar-settings-extensions', '/stellar-settings-extensions.js?v=1');
    // The clean /app UI is owned by app.html. Do not dynamically reload the
    // legacy command dock or its CSS here, or cached clients can restore the
    // old Chat/Build/Fix/Deploy composer after the page has rendered.
  }

  function enhanceModelPicker() {
    if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;
    const menu = document.getElementById('model-menu');
    if (!menu) return;

    const configs = {
      fabie: {
        icon: '⚡',
        name: 'Spark',
        badge: 'FAST',
        description: 'Quick drafts, small fixes and lightweight work'
      },
      smart: {
        icon: '✦',
        name: 'Star',
        badge: 'RECOMMENDED',
        description: 'Best balance for most FiveM and Roblox builds'
      },
      comet: {
        icon: '☄',
        name: 'Comet',
        badge: 'DEEP',
        description: 'Architecture, debugging and larger systems'
      },
      ultra: {
        icon: '◆',
        name: 'Nova',
        badge: 'PRO',
        description: 'Maximum Stellar quality for difficult project work'
      }
    };

    menu.classList.add('stellar-model-picker-v2');
    const heading = menu.querySelector('.model-menu-heading');
    if (heading && heading.dataset.stellarEnhanced !== 'true') {
      heading.dataset.stellarEnhanced = 'true';
      heading.innerHTML = '<span><strong>Choose a model</strong><small>Match Stellar to the job</small></span><span class="stellar-model-heading-mark" aria-hidden="true">✦</span>';
    }

    Object.entries(configs).forEach(([key, config]) => {
      const option = menu.querySelector('[data-model-choice="' + key + '"]');
      if (!option) return;
      option.classList.add('stellar-model-option');
      option.dataset.modelTone = key;
      if (option.dataset.stellarEnhanced === 'true') return;
      option.dataset.stellarEnhanced = 'true';
      option.innerHTML =
        '<span class="stellar-model-icon" aria-hidden="true">' + config.icon + '</span>' +
        '<span class="stellar-model-copy">' +
          '<span class="stellar-model-title-row">' +
            '<strong class="stellar-model-title">' + config.name + '</strong>' +
            '<span class="stellar-model-badge">' + config.badge + '</span>' +
          '</span>' +
          '<span class="stellar-model-description">' + config.description + '</span>' +
        '</span>' +
        '<span class="stellar-model-selected" aria-hidden="true">✓</span>';
    });

    const ownerModels = menu.querySelectorAll('#provider-models [data-model-choice]');
    ownerModels.forEach((option) => option.classList.add('stellar-owner-model-option'));

    const planButton = Array.from(menu.querySelectorAll('button')).find((button) =>
      !button.hasAttribute('data-model-choice') && /plans/i.test(String(button.textContent || ''))
    );
    if (planButton) planButton.classList.add('stellar-model-plans-link');

    const normalizeModelKey = (value) => {
      const raw = String(value || '').trim().toLowerCase();
      const aliases = { spark:'fabie', star:'smart', nova:'ultra' };
      const key = aliases[raw] || raw;
      return configs[key] ? key : '';
    };

    const selectedKey = () => {
      try {
        if (typeof Store !== 'undefined') {
          const storedKey = normalizeModelKey(Store?.get?.().model);
          if (storedKey) return storedKey;
        }
      } catch {}

      const selected = menu.querySelector('[data-model-choice][aria-checked="true"]');
      return normalizeModelKey(selected?.getAttribute('data-model-choice')) || 'smart';
    };

    const selectedConfig = () => configs[selectedKey()] || configs.smart;

    const syncMenuSelection = () => {
      const key = selectedKey();
      Object.keys(configs).forEach((modelKey) => {
        const option = menu.querySelector('[data-model-choice="' + modelKey + '"]');
        if (!option) return;
        const checked = modelKey === key ? 'true' : 'false';
        if (option.getAttribute('aria-checked') !== checked) option.setAttribute('aria-checked', checked);
      });
    };

    const syncTrigger = () => {
      syncMenuSelection();
      const config = selectedConfig();
      document.querySelectorAll('#composer-model-trigger, .stellar-model-proxy').forEach((trigger) => {
        trigger.dataset.modelTone = Object.keys(configs).find((key) => configs[key] === config) || 'smart';
        trigger.classList.add('stellar-model-trigger-v2');
        trigger.innerHTML =
          '<span class="stellar-trigger-orb" aria-hidden="true"></span>' +
          '<span class="composer-mode-name">' + config.name + '</span>' +
          '<span class="stellar-trigger-meta">' + (config.badge === 'RECOMMENDED' ? 'Balanced' : config.badge.charAt(0) + config.badge.slice(1).toLowerCase()) + '</span>' +
          '<span aria-hidden="true" class="composer-mode-caret">⌄</span>';
        trigger.setAttribute('aria-label', 'Choose AI model. Current: ' + config.name);
      });
    };

    syncMenuSelection();
    syncTrigger();
    if (menu.dataset.stellarPickerWatch !== 'true') {
      menu.dataset.stellarPickerWatch = 'true';
      const observer = new MutationObserver(() => {
        syncMenuSelection();
        syncTrigger();
      });
      observer.observe(menu, { subtree:true, attributes:true, attributeFilter:['aria-checked'] });
      menu.addEventListener('click', () => {
        window.setTimeout(() => {
          syncMenuSelection();
          syncTrigger();
        }, 35);
      });
    }
  }

  function installReliableModelPickerToggle() {
    if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;
    if (document.documentElement.dataset.stellarModelToggleInstalled === 'true') return;
    document.documentElement.dataset.stellarModelToggleInstalled = 'true';

    const syncExpanded = (open) => {
      document.querySelectorAll('#composer-model-trigger, .stellar-model-proxy, #model-btn').forEach((trigger) => {
        trigger.setAttribute('aria-expanded', String(Boolean(open)));
      });
    };

    const close = () => {
      const menu = document.getElementById('model-menu');
      if (!menu) return;
      menu.hidden = true;
      menu.classList.add('hidden');
      syncExpanded(false);
    };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('#composer-model-trigger, .stellar-model-proxy, #model-btn');
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

        const menu = document.getElementById('model-menu');
        if (!menu) return;

        enhanceModelPicker();

        // The legacy picker can live inside a hidden/clipped header wrapper.
        // Hoist it to <body> before opening so signed-in and compact layouts
        // cannot suppress the menu with display/overflow/stacking context.
        if (menu.parentElement !== document.body) {
          document.body.appendChild(menu);
        }

        const willOpen = menu.classList.contains('hidden') || menu.hidden;
        menu.hidden = !willOpen;
        menu.classList.toggle('hidden', !willOpen);
        syncExpanded(willOpen);

        if (willOpen) {
          // Re-run the picker enhancer after hoisting/opening so the visual
          // checkmark is reconciled with Store.model before the user sees it.
          enhanceModelPicker();
          const selected = menu.querySelector('[data-model-choice][aria-checked="true"]');
          window.requestAnimationFrame(() => selected?.scrollIntoView?.({ block:'nearest' }));
        }
        return;
      }

      const menu = document.getElementById('model-menu');
      if (menu && !menu.classList.contains('hidden') && !event.target.closest?.('#model-menu')) close();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  function enhanceAppComposer() {
    if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;
    const input = document.getElementById('txt');
    const composer = document.querySelector('.input-area > .flex');
    if (!input || !composer) return;

    if (input.dataset.stellarAutosize !== 'true') {
      input.dataset.stellarAutosize = 'true';
      const resize = () => {
        input.style.height = 'auto';
        const max = window.innerWidth <= 767 ? 132 : 180;
        input.style.height = Math.min(Math.max(input.scrollHeight, 46), max) + 'px';
        input.style.overflowY = input.scrollHeight > max ? 'auto' : 'hidden';
      };
      input.addEventListener('input', resize, { passive: true });
      input.addEventListener('paste', () => window.setTimeout(resize, 0));
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) window.setTimeout(resize, 0);
      });
      window.addEventListener('resize', resize, { passive: true });
      resize();
    }

    if (composer.dataset.stellarPremiumComposer === 'true') return;
    composer.dataset.stellarPremiumComposer = 'true';

    const area = composer.closest('.input-area');
    const modeTrigger = document.getElementById('composer-model-trigger');
    const mic = document.getElementById('mic-btn');
    const send = document.getElementById('send-btn');
    const oldAttach = document.getElementById('image-upload-btn');

    const bottom = document.createElement('div');
    bottom.className = 'stellar-composer-bottom';

    const tools = document.createElement('div');
    tools.className = 'stellar-composer-tools';

    const attach = document.createElement('button');
    attach.type = 'button';
    attach.className = 'stellar-composer-plus';
    attach.setAttribute('aria-label', 'Attach files or images');
    attach.title = 'Attach files or images';
    attach.innerHTML = '<span aria-hidden="true">＋</span><span class="stellar-composer-plus-label">Attach</span>';
    attach.addEventListener('click', () => document.getElementById('image-upload-input')?.click());
    tools.appendChild(attach);

    const mountModelControl = () => {
      const real = document.getElementById('composer-model-trigger');
      const proxy = tools.querySelector('.stellar-model-proxy');
      if (real) {
        real.classList.add('stellar-inline-model-trigger');
        if (real.parentElement !== tools) tools.appendChild(real);
        if (proxy) proxy.remove();
        return;
      }
      if (proxy) return;

      const fallback = document.createElement('button');
      fallback.type = 'button';
      fallback.className = 'ws-toggle composer-model-trigger stellar-inline-model-trigger stellar-model-proxy';
      fallback.setAttribute('aria-controls', 'model-menu');
      fallback.setAttribute('aria-haspopup', 'menu');
      fallback.setAttribute('aria-expanded', 'false');
      fallback.setAttribute('aria-label', 'Choose AI mode. Current: Star');
      fallback.innerHTML = '<span aria-hidden="true">✦</span><span class="composer-mode-name">Star</span><span aria-hidden="true" class="composer-mode-caret">▾</span>';
      fallback.addEventListener('click', (event) => {
        if (typeof window.toggleModelMenu === 'function') {
          window.toggleModelMenu(event);
          window.setTimeout(() => {
            const menu = document.getElementById('model-menu');
            fallback.setAttribute('aria-expanded', menu && !menu.classList.contains('hidden') ? 'true' : 'false');
          }, 0);
        }
      });
      tools.appendChild(fallback);

      const menu = document.getElementById('model-menu');
      const syncSelected = () => {
        const selected = menu?.querySelector('[data-model-choice][aria-checked="true"]');
        const label = selected?.querySelector('.font-black')?.childNodes?.[0]?.textContent?.replace(/[✨⭐☄️🚀]/g, '').trim()
          || selected?.textContent?.replace(/✓|PRO|·.*$/g, '').replace(/[✨⭐☄️🚀]/g, '').trim()
          || 'Star';
        const name = fallback.querySelector('.composer-mode-name');
        if (name) name.textContent = label || 'Star';
        fallback.setAttribute('aria-label', 'Choose AI mode. Current: ' + (label || 'Star'));
      };
      syncSelected();
      if (menu && menu.dataset.stellarModelSync !== 'true') {
        menu.dataset.stellarModelSync = 'true';
        const menuObserver = new MutationObserver(syncSelected);
        menuObserver.observe(menu, { subtree:true, attributes:true, attributeFilter:['aria-checked'], childList:true });
      }
    };

    mountModelControl();

    const actions = document.createElement('div');
    actions.className = 'stellar-composer-actions';
    if (mic) actions.appendChild(mic);
    if (send) actions.appendChild(send);

    bottom.appendChild(tools);
    bottom.appendChild(actions);
    composer.appendChild(bottom);

    if (oldAttach) {
      oldAttach.classList.add('stellar-legacy-attach');
      oldAttach.hidden = true;
      oldAttach.setAttribute('aria-hidden', 'true');
      oldAttach.tabIndex = -1;
    }
    const modeDock = area?.querySelector('.composer-mode-dock');
    if (modeDock) modeDock.classList.add('stellar-empty-mode-dock');

    if (document.body.dataset.stellarModelMountWatch !== 'true') {
      document.body.dataset.stellarModelMountWatch = 'true';
      const modelMountObserver = new MutationObserver(() => mountModelControl());
      modelMountObserver.observe(document.body, { subtree:true, childList:true });
    }

    if (area && !area.querySelector('.stellar-home-intro')) {
      const intro = document.createElement('div');
      intro.className = 'stellar-home-intro';
      intro.innerHTML = '<div class="stellar-home-kicker" id="stellar-home-kicker">Stellar AI</div><div class="stellar-home-question">What can I help you build?</div><div class="stellar-home-sub">Build, fix, research, or improve something with Stellar.</div>';
      area.insertBefore(intro, area.firstChild);

      const nameNode = document.getElementById('acct-name');
      const syncName = () => {
        const raw = String(nameNode?.textContent || '').trim();
        const valid = raw && raw !== '—' && raw !== '?' && raw.length <= 80;
        const first = valid ? raw.split(/\\s+/)[0] : '';
        const h = new Date().getHours();
        const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good evening';
        const kicker = document.getElementById('stellar-home-kicker');
        if (kicker) kicker.textContent = first ? greeting + ', ' + first : 'Stellar AI';
      };
      syncName();
      if (nameNode) {
        const observer = new MutationObserver(syncName);
        observer.observe(nameNode, { childList:true, characterData:true, subtree:true });
      }
    }
  }

  loadHomePresentation();
  loadSettingsPresentation();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyCurrencyLabels();
      installVoicePickerPolish();
      installServiceWorkerUpdateRefresh();
      watchSidebarRailLabels();
      enhanceModelPicker();
      installReliableModelPickerToggle();
      enhanceAppComposer();
      enhanceModelPicker();
    }, { once: true });
  } else {
    applyCurrencyLabels();
    installVoicePickerPolish();
    installServiceWorkerUpdateRefresh();
    watchSidebarRailLabels();
    enhanceModelPicker();
    installReliableModelPickerToggle();
    enhanceAppComposer();
    enhanceModelPicker();
  }
})();
