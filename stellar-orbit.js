(() => {
  'use strict';
  if (window.__stellarOrbitV5Safe) return;
  window.__stellarOrbitV5Safe = true;

  const TIERS = Object.freeze({
    fabie: { name:'Spark', mode:'Fast', symbol:'✦', desc:'Quick drafts, small fixes and lightweight work.', power:1 },
    smart: { name:'Star', mode:'Balanced', symbol:'★', desc:'Recommended for most Roblox and FiveM builds.', power:2, recommended:true },
    comet: { name:'Comet', mode:'Deep', symbol:'☄', desc:'Architecture, debugging and larger multi-file systems.', power:3 },
    ultra: { name:'Nova', mode:'Max', symbol:'✺', desc:'Highest-capability Stellar tier for difficult project work.', power:4, pro:true }
  });

  const state = { selected:'smart', syncing:false };
  const safeRun = (fn) => { try { fn(); } catch (error) { console.warn('[Stellar Orbit]', error); } };
  const setText = (node, value) => {
    if (!node) return;
    const next = String(value ?? '');
    if (node.textContent !== next) node.textContent = next;
  };
  const setAttr = (node, name, value) => {
    if (!node) return;
    const next = String(value ?? '');
    if (node.getAttribute(name) !== next) node.setAttribute(name, next);
  };

  function selectedKey() {
    const normalize = (value) => {
      const raw = String(value || '').trim().toLowerCase();
      const aliases = { spark:'fabie', star:'smart', nova:'ultra' };
      const key = aliases[raw] || raw;
      return TIERS[key] ? key : '';
    };

    // The app Store is the source of truth. The menu's aria state can briefly
    // rerender to Star while a selection is closing, which previously caused
    // Orbit to overwrite Spark/Comet back to Star.
    try {
      if (typeof Store !== 'undefined') {
        const stored = normalize(Store?.get?.().model);
        if (stored) return stored;
      }
    } catch {}

    const checked = document.querySelector('#model-menu [data-model-choice][aria-checked="true"]');
    const checkedKey = normalize(checked?.getAttribute('data-model-choice'));
    return checkedKey || state.selected;
  }

  function tierMarkup(key) {
    const t = TIERS[key];
    return `<div class="stellar-model-line">
      <span class="stellar-model-symbol" aria-hidden="true">${t.symbol}</span>
      <span class="stellar-model-name">${t.name}</span>
      <span class="stellar-model-mode">${t.mode}</span>
      ${t.recommended ? '<span class="stellar-model-badge">Recommended</span>' : ''}
      ${t.pro ? '<span class="stellar-model-mode stellar-model-pro">Pro</span>' : ''}
    </div><span class="stellar-model-desc">${t.desc}</span>`;
  }

  function decorateTierButtons() {
    Object.entries(TIERS).forEach(([key, tier]) => {
      const button = document.querySelector(`#model-menu [data-model-choice="${key}"]`);
      if (!button) return;
      if (button.dataset.stellarTier !== tier.mode.toLowerCase()) button.dataset.stellarTier = tier.mode.toLowerCase();
      if (button.dataset.stellarPower !== String(tier.power)) button.dataset.stellarPower = String(tier.power);
      setAttr(button, 'aria-label', `Select ${tier.name} — ${tier.mode}. ${tier.desc}${tier.pro ? ' Pro plan.' : ''}`);
      setAttr(button, 'title', `${tier.name} · ${tier.mode} — ${tier.desc}`);
      const copy = button.firstElementChild;
      if (copy && !copy.querySelector('.stellar-model-line')) copy.innerHTML = tierMarkup(key);
    });
  }

  function updatePowerUI(tier) {
    document.querySelectorAll('[data-stellar-power-meter]').forEach((meter) => {
      meter.querySelectorAll('span').forEach((bar, index) => {
        const active = index < tier.power;
        if (bar.classList.contains('is-on') !== active) bar.classList.toggle('is-on', active);
      });
    });
    document.querySelectorAll('.stellar-model-ladder').forEach((ladder) => {
      ladder.querySelectorAll('span').forEach((bar, index) => {
        const active = index < tier.power;
        const current = index === tier.power - 1;
        if (bar.classList.contains('is-on') !== active) bar.classList.toggle('is-on', active);
        if (bar.classList.contains('is-current') !== current) bar.classList.toggle('is-current', current);
      });
    });
    document.querySelectorAll('[data-stellar-power-label]').forEach((n) => setText(n, `${tier.mode} power`));
  }

  function decorateMenu() {
    const menu = document.getElementById('model-menu');
    if (!menu) return;
    setAttr(menu, 'aria-label', 'Choose Stellar model power');

    const heading = menu.querySelector('.model-menu-heading');
    const growthOwnsHeading = !!menu.querySelector('.stellar-reasoning-panel');
    if (heading && !growthOwnsHeading) {
      const markup = '<span>Model power</span><span>Fast → Max depth</span>';
      if (heading.innerHTML !== markup) heading.innerHTML = markup;
    }

    if (!menu.querySelector('.stellar-model-ladder')) {
      const ladder = document.createElement('div');
      ladder.className = 'stellar-model-ladder';
      ladder.setAttribute('aria-label', 'Stellar model power levels');
      ladder.innerHTML = '<span>Fast</span><span>Balanced</span><span>Deep</span><span>Max</span>';
      heading?.insertAdjacentElement('afterend', ladder);
    }

    if (!menu.querySelector('.stellar-model-note')) {
      const note = document.createElement('div');
      note.className = 'stellar-model-note';
      note.innerHTML = '<strong>How power works:</strong> higher levels spend more effort on harder builds. Your existing plan still controls which Stellar tiers are available.';
      const plans = [...menu.querySelectorAll('button')].find((button) => /see all plans/i.test(button.textContent || ''));
      if (plans) plans.insertAdjacentElement('beforebegin', note);
      else menu.appendChild(note);
    }

    decorateTierButtons();
  }

  function closeSidebarOnMobile() {
    if (window.innerWidth > 1100) return;
    const toggle = document.getElementById('mobile-menu-toggle');
    if (toggle?.getAttribute('aria-expanded') === 'true') {
      try { if (typeof toggleSidebar === 'function') toggleSidebar(); } catch {}
    }
  }

  function afterResponsiveSidebarClose(action) {
    const delay = window.innerWidth <= 1100 ? 180 : 0;
    closeSidebarOnMobile();
    window.setTimeout(action, delay);
  }

  function openModelPickerFromOrbit() {
    afterResponsiveSidebarClose(() => {
      const button = document.getElementById('model-btn');
      const menu = document.getElementById('model-menu');
      if (!button || !menu) return;
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      window.setTimeout(() => {
        menu.querySelector('[data-model-choice][aria-checked="true"]')?.focus({ preventScroll:true });
      }, 30);
    });
  }

  function openUsageFromOrbit() {
    afterResponsiveSidebarClose(() => {
      try {
        if (typeof openUsage === 'function') openUsage();
        else document.getElementById('credits-btn')?.click();
      } catch {}
    });
  }

  function openPlansFromOrbit() {
    afterResponsiveSidebarClose(() => {
      try { if (typeof openPlans === 'function') openPlans(); } catch {}
    });
  }

  function openSettingsFromOrbit() {
    afterResponsiveSidebarClose(() => {
      try { if (typeof openSettings === 'function') openSettings(); } catch {}
    });
  }

  function ensureNavigationStyles() {
    if (document.getElementById('stellar-clean-nav-styles')) return;
    const style = document.createElement('style');
    style.id = 'stellar-clean-nav-styles';
    style.textContent = `
      body.stellar-orbit-v3 #sidebar .side-foot{display:none!important}
      .stellar-orbit-tools-label{margin-top:12px!important}
      .stellar-top-nav{display:flex;align-items:center;justify-content:center;gap:4px;margin-left:auto;margin-right:12px;padding:4px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(16,10,31,.18);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
      .stellar-top-link{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 10px;border:0;border-radius:9px;color:rgba(255,255,255,.82)!important;background:transparent;text-decoration:none!important;font-size:12px;font-weight:750;letter-spacing:-.01em;white-space:nowrap;transition:background .16s ease,color .16s ease,border-color .16s ease}
      .stellar-top-link:hover,.stellar-top-link:focus-visible{color:#fff!important;background:rgba(255,255,255,.12)}
      .stellar-top-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}
      .stellar-top-model,.stellar-top-settings{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border:1px solid rgba(255,255,255,.18);color:#fff;background:rgba(255,255,255,.08);box-shadow:inset 0 1px rgba(255,255,255,.07)}
      .stellar-top-model{gap:7px;max-width:190px;padding:0 11px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .stellar-top-model-star{display:inline-grid;place-items:center;width:20px;height:20px;flex:0 0 20px;border-radius:50%;color:#f4e8ff;background:rgba(255,255,255,.09);font-size:10px}
      .stellar-top-model:hover,.stellar-top-model:focus-visible,.stellar-top-settings:hover,.stellar-top-settings:focus-visible{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.34)}
      .stellar-top-settings{width:36px;min-width:36px;padding:0;border-radius:10px;font-size:15px}
      body.light .stellar-top-nav{border-color:rgba(32,22,56,.12);background:rgba(255,255,255,.42)}
      body.light .stellar-top-link{color:#3a2c50!important}
      body.light .stellar-top-link:hover,body.light .stellar-top-link:focus-visible{color:#1f1430!important;background:rgba(72,42,113,.08)}
      body.light .stellar-top-model,body.light .stellar-top-settings{color:#2d1d43;background:rgba(255,255,255,.66);border-color:rgba(54,32,83,.16)}
      @media(max-width:1100px){.stellar-top-nav{display:none}.stellar-top-actions{margin-left:auto}.stellar-top-model{max-width:170px}}
      @media(max-width:760px){.stellar-top-settings{display:none}.stellar-top-model{max-width:148px;min-height:34px;padding:0 9px}.stellar-top-model-star{width:18px;height:18px;flex-basis:18px}.stellar-orbit-primary-copy span{display:none}.stellar-orbit-primary-btn,.stellar-orbit-primary-link{min-height:44px}.stellar-orbit-tools-label{margin-top:10px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureSpaceStrip() {
    const side = document.getElementById('sidebar');
    if (!side || side.querySelector('.stellar-space-strip')) return;
    const brand = side.querySelector('.sidebar-brand-row');
    if (!brand) return;

    const strip = document.createElement('button');
    strip.type = 'button';
    strip.className = 'stellar-space-strip';
    strip.setAttribute('aria-haspopup', 'menu');
    strip.setAttribute('aria-controls', 'model-menu');
    strip.setAttribute('aria-label', 'Change Stellar model power');
    strip.innerHTML = `
      <span class="stellar-space-orbit" aria-hidden="true">✦</span>
      <span class="stellar-space-copy">
        <span class="stellar-space-kicker">Stellar Orbit · Model power</span>
        <span class="stellar-space-model" data-stellar-model>Star · Balanced</span>
      </span>
      <span class="stellar-space-depth" data-stellar-depth>Balanced</span>
      <span class="stellar-power-meter" data-stellar-power-meter aria-hidden="true"><span></span><span></span><span></span><span></span></span>`;
    strip.addEventListener('click', openModelPickerFromOrbit);
    brand.insertAdjacentElement('afterend', strip);
  }

  function ensureOrbitPrimaryNav() {
    const side = document.getElementById('sidebar');
    if (!side || side.querySelector('.stellar-orbit-primary')) return;
    const search = side.querySelector('#search');
    if (!search) return;

    const nav = document.createElement('section');
    nav.className = 'stellar-orbit-primary';
    nav.setAttribute('aria-label', 'Stellar workspace and account tools');
    nav.innerHTML = `
      <div class="stellar-orbit-rail-label">Workspace</div>
      <div class="stellar-orbit-primary-grid">
        <button type="button" class="stellar-orbit-primary-btn" data-orbit-open-model>
          <span class="stellar-orbit-primary-icon" aria-hidden="true">✦</span>
          <span class="stellar-orbit-primary-copy"><strong>Models</strong><span data-stellar-side-model>Star · Balanced</span></span>
          <span class="stellar-orbit-primary-meta" data-stellar-power-label>Balanced power</span>
        </button>
        <button type="button" class="stellar-orbit-primary-btn" data-orbit-open-files>
          <span class="stellar-orbit-primary-icon" aria-hidden="true">◫</span>
          <span class="stellar-orbit-primary-copy"><strong>Project files</strong><span>Open the generated workspace</span></span>
          <span class="stellar-orbit-primary-meta">Files</span>
        </button>
        <a class="stellar-orbit-primary-link" href="/blog">
          <span class="stellar-orbit-primary-icon" aria-hidden="true">⌁</span>
          <span class="stellar-orbit-primary-copy"><strong>Guides</strong><span>Roblox, FiveM and QBCore tutorials</span></span>
          <span class="stellar-orbit-primary-meta">Learn</span>
        </a>
      </div>
      <div class="stellar-orbit-rail-label stellar-orbit-tools-label">Tools & account</div>
      <div class="stellar-orbit-primary-grid">
        <button type="button" class="stellar-orbit-primary-btn" data-orbit-open-usage>
          <span class="stellar-orbit-primary-icon" aria-hidden="true">◔</span>
          <span class="stellar-orbit-primary-copy"><strong>Usage & credit</strong><span>Requests, balance and limits</span></span>
          <span class="stellar-orbit-primary-meta">Usage</span>
        </button>
        <button type="button" class="stellar-orbit-primary-btn" data-orbit-open-plans>
          <span class="stellar-orbit-primary-icon" aria-hidden="true">◇</span>
          <span class="stellar-orbit-primary-copy"><strong>Plans</strong><span>Compare Stellar tiers</span></span>
          <span class="stellar-orbit-primary-meta">Upgrade</span>
        </button>
        <a class="stellar-orbit-primary-link" href="/terms.html">
          <span class="stellar-orbit-primary-icon" aria-hidden="true">§</span>
          <span class="stellar-orbit-primary-copy"><strong>Terms & privacy</strong><span>Policies, privacy and data use</span></span>
          <span class="stellar-orbit-primary-meta">Legal</span>
        </a>
        <button type="button" class="stellar-orbit-primary-btn" data-orbit-open-settings>
          <span class="stellar-orbit-primary-icon" aria-hidden="true">⚙</span>
          <span class="stellar-orbit-primary-copy"><strong>Settings</strong><span>Appearance, preferences and account</span></span>
          <span class="stellar-orbit-primary-meta">Open</span>
        </button>
      </div>`;

    nav.querySelector('[data-orbit-open-model]')?.addEventListener('click', openModelPickerFromOrbit);
    nav.querySelector('[data-orbit-open-files]')?.addEventListener('click', () => {
      try { if (typeof toggleWorkspace === 'function') toggleWorkspace(); } catch {}
      closeSidebarOnMobile();
    });
    nav.querySelector('[data-orbit-open-usage]')?.addEventListener('click', openUsageFromOrbit);
    nav.querySelector('[data-orbit-open-plans]')?.addEventListener('click', openPlansFromOrbit);
    nav.querySelector('[data-orbit-open-settings]')?.addEventListener('click', openSettingsFromOrbit);
    search.insertAdjacentElement('afterend', nav);
  }

  function ensureTopbarNavigation() {
    const topbar = document.querySelector('#main-col .topbar');
    if (!topbar || topbar.querySelector('.stellar-top-nav')) return;

    const nav = document.createElement('nav');
    nav.className = 'stellar-top-nav';
    nav.setAttribute('aria-label', 'Stellar quick links');
    nav.innerHTML = `
      <a class="stellar-top-link" href="/models">Models</a>
      <button type="button" class="stellar-top-link" data-stellar-top-plans>Plans</button>
      <a class="stellar-top-link" href="/blog">Guides</a>
      <a class="stellar-top-link" href="/terms.html">Terms & privacy</a>`;

    const actions = document.createElement('div');
    actions.className = 'stellar-top-actions';
    actions.innerHTML = `
      <button type="button" class="stellar-top-model" data-stellar-top-picker aria-label="Change Stellar model power" title="Change model power">
        <span class="stellar-top-model-star" aria-hidden="true">★</span>
        <span data-stellar-top-model>Star · Balanced</span>
      </button>
      <button type="button" class="stellar-top-settings" data-stellar-top-settings aria-label="Open Settings" title="Settings">⚙</button>`;

    nav.querySelector('[data-stellar-top-plans]')?.addEventListener('click', openPlansFromOrbit);
    actions.querySelector('[data-stellar-top-picker]')?.addEventListener('click', openModelPickerFromOrbit);
    actions.querySelector('[data-stellar-top-settings]')?.addEventListener('click', openSettingsFromOrbit);
    topbar.append(nav, actions);
  }

  function enhanceSidebarLabels() {
    const heading = document.getElementById('chats-heading');
    if (heading) setText(heading, 'Recent chats');
  }

  function enhanceUsageAccess() {
    const credits = document.getElementById('credits-btn');
    if (!credits) return;

    const compact = window.matchMedia('(max-width: 1100px)').matches;
    if (compact) {
      credits.style.setProperty('display', 'inline-flex', 'important');
      credits.style.setProperty('align-items', 'center', 'important');
      credits.style.setProperty('justify-content', 'center', 'important');
      credits.style.setProperty('flex', '0 0 auto', 'important');
      credits.style.setProperty('max-width', 'min(48vw, 220px)', 'important');
      const footRight = credits.closest('.composer-foot')?.querySelector('.foot-right');
      if (footRight) {
        footRight.style.setProperty('width', 'auto', 'important');
        footRight.style.setProperty('margin-left', 'auto', 'important');
      }
    } else {
      ['display', 'align-items', 'justify-content', 'flex', 'max-width'].forEach((property) => credits.style.removeProperty(property));
      const footRight = credits.closest('.composer-foot')?.querySelector('.foot-right');
      if (footRight) {
        footRight.style.removeProperty('width');
        footRight.style.removeProperty('margin-left');
      }
    }

    setAttr(credits, 'aria-label', credits.getAttribute('aria-label') || 'Open usage and request limits');
    setAttr(credits, 'title', credits.getAttribute('title') || 'Usage and request limits');
  }

  function enhanceSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    setAttr(modal, 'data-stellar-orbit', 'v5');
    const subtitle = modal.querySelector('.settings-subtitle');
    if (subtitle) setText(subtitle, 'Your Stellar workspace, model power, appearance, usage and account controls.');

    const card = modal.querySelector('.set-card');
    const head = modal.querySelector('.set-head');
    if (!card || !head || card.querySelector('.stellar-settings-hero')) return;

    const hero = document.createElement('div');
    hero.className = 'stellar-settings-hero';
    hero.innerHTML = `
      <div class="stellar-settings-hero-main">
        <div class="stellar-settings-hero-copy">
          <span class="stellar-settings-eyebrow">Stellar Orbit · Control centre</span>
          <strong>Make Stellar feel like your workspace.</strong>
          <span>Change model power, check usage, manage your plan and jump back into your guides without hunting through menus.</span>
        </div>
        <div class="stellar-settings-model-card">
          <span class="stellar-settings-model-icon" aria-hidden="true">★</span>
          <span><small>Current model</small><strong data-stellar-settings-model>Star · Balanced</strong></span>
          <button type="button" data-orbit-models>Change</button>
        </div>
      </div>
      <div class="stellar-settings-shortcuts" aria-label="Settings shortcuts">
        <button type="button" data-orbit-usage>Usage</button>
        <button type="button" data-orbit-plans>Plans</button>
        <a href="/models">Model guide</a>
        <a href="/terms.html">Terms & privacy</a>
        <a href="/blog">Guides</a>
      </div>`;

    head.insertAdjacentElement('afterend', hero);
    hero.querySelector('[data-orbit-models]')?.addEventListener('click', () => {
      try { if (typeof closeSettings === 'function') closeSettings(); } catch {}
      window.setTimeout(openModelPickerFromOrbit, 50);
    });
    hero.querySelector('[data-orbit-usage]')?.addEventListener('click', () => {
      try {
        if (typeof closeSettings === 'function') closeSettings();
        if (typeof openUsage === 'function') openUsage();
      } catch {}
    });
    hero.querySelector('[data-orbit-plans]')?.addEventListener('click', () => {
      try {
        if (typeof closeSettings === 'function') closeSettings();
        if (typeof openPlans === 'function') openPlans();
      } catch {}
    });
  }

  function syncLabel() {
    const key = selectedKey();
    const tier = TIERS[key] || TIERS.smart;
    state.selected = key;

    const button = document.getElementById('model-btn');
    const text = `${tier.symbol} ${tier.name} · ${tier.mode} ▾`;
    if (button && button.textContent.trim() !== text && !state.syncing) {
      state.syncing = true;
      setText(button, text);
      setAttr(button, 'aria-label', `Choose Stellar model power. Current: ${tier.name}, ${tier.mode}.`);
      setAttr(button, 'title', `${tier.name} · ${tier.mode}`);
      state.syncing = false;
    }

    document.querySelectorAll('[data-stellar-model]').forEach((n) => setText(n, `${tier.name} · ${tier.mode}`));
    document.querySelectorAll('[data-stellar-side-model]').forEach((n) => setText(n, `${tier.name} · ${tier.mode}`));
    document.querySelectorAll('[data-stellar-settings-model]').forEach((n) => setText(n, `${tier.name} · ${tier.mode}`));
    document.querySelectorAll('[data-stellar-top-model]').forEach((n) => setText(n, `${tier.name} · ${tier.mode}`));
    document.querySelectorAll('[data-stellar-depth]').forEach((n) => setText(n, tier.mode));
    updatePowerUI(tier);
  }

  function bindModelEvents() {
    const menu = document.getElementById('model-menu');
    if (menu && !menu.dataset.stellarOrbitBound) {
      menu.dataset.stellarOrbitBound = 'true';
      menu.addEventListener('click', (event) => {
        if (event.target.closest('[data-model-choice], [data-growth-level]')) window.setTimeout(syncLabel, 35);
      });
      menu.addEventListener('keydown', () => window.setTimeout(syncLabel, 35));
    }
    const button = document.getElementById('model-btn');
    if (button && !button.dataset.stellarOrbitBound) {
      button.dataset.stellarOrbitBound = 'true';
      button.addEventListener('click', () => window.setTimeout(syncLabel, 35));
    }
  }

  function addSchema() {
    if (document.querySelector('script[data-stellar-app-schema]')) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.stellarAppSchema = 'safe-v5';
    script.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'SoftwareApplication',
      name:'Stellar AI',
      applicationCategory:'DeveloperApplication',
      operatingSystem:'Web',
      url:'https://trystellarai.com/app',
      description:'AI development workspace for Roblox Luau and FiveM projects.',
      featureList:['Roblox Luau development','FiveM QBCore development','FiveM ESX development','Multi-file project generation','Code fixing and iteration']
    });
    document.head.appendChild(script);
  }

  function syncAll() {
    if (document.hidden) return;
    safeRun(ensureNavigationStyles);
    safeRun(decorateMenu);
    safeRun(ensureSpaceStrip);
    safeRun(ensureOrbitPrimaryNav);
    safeRun(ensureTopbarNavigation);
    safeRun(enhanceSidebarLabels);
    safeRun(enhanceUsageAccess);
    safeRun(enhanceSettings);
    safeRun(bindModelEvents);
    safeRun(syncLabel);
  }

  function init() {
    document.body.classList.add('stellar-orbit-v2', 'stellar-orbit-v3');
    safeRun(ensureNavigationStyles);
    safeRun(decorateMenu);
    safeRun(ensureSpaceStrip);
    safeRun(ensureOrbitPrimaryNav);
    safeRun(ensureTopbarNavigation);
    safeRun(enhanceSidebarLabels);
    safeRun(enhanceUsageAccess);
    safeRun(enhanceSettings);
    safeRun(bindModelEvents);
    safeRun(syncLabel);
    safeRun(addSchema);
    window.addEventListener('focus', syncAll, { passive:true });
    window.addEventListener('resize', () => {
      safeRun(enhanceUsageAccess);
      safeRun(ensureTopbarNavigation);
    }, { passive:true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAll(); });
    window.setTimeout(syncAll, 250);
    window.__stellarOrbitHealth = { version:'safe-v5', observers:0, startedAt:Date.now() };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();