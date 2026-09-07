(() => {
  'use strict';
  if (window.__stellarOrbitV4Safe) return;
  window.__stellarOrbitV4Safe = true;

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
    const checked = document.querySelector('#model-menu [data-model-choice][aria-checked="true"]');
    const key = checked?.getAttribute('data-model-choice');
    return TIERS[key] ? key : state.selected;
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
    if (window.innerWidth > 767) return;
    const toggle = document.getElementById('mobile-menu-toggle');
    if (toggle?.getAttribute('aria-expanded') === 'true') {
      try { if (typeof toggleSidebar === 'function') toggleSidebar(); } catch {}
    }
  }

  function openModelPickerFromOrbit() {
    closeSidebarOnMobile();
    const open = () => {
      const button = document.getElementById('model-btn');
      const menu = document.getElementById('model-menu');
      if (!button || !menu) return;
      if (button.getAttribute('aria-expanded') !== 'true') button.click();
      window.setTimeout(() => {
        menu.querySelector('[data-model-choice][aria-checked="true"]')?.focus({ preventScroll:true });
      }, 30);
    };
    window.setTimeout(open, window.innerWidth <= 767 ? 170 : 0);
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
    nav.setAttribute('aria-label', 'Stellar workspace');
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
          <span class="stellar-orbit-primary-copy"><strong>Project files</strong><span>Open the current generated workspace</span></span>
          <span class="stellar-orbit-primary-meta">Files</span>
        </button>
        <a class="stellar-orbit-primary-link" href="/blog">
          <span class="stellar-orbit-primary-icon" aria-hidden="true">⌁</span>
          <span class="stellar-orbit-primary-copy"><strong>Guides</strong><span>Roblox, FiveM and QBCore tutorials</span></span>
          <span class="stellar-orbit-primary-meta">74</span>
        </a>
      </div>`;

    nav.querySelector('[data-orbit-open-model]')?.addEventListener('click', openModelPickerFromOrbit);
    nav.querySelector('[data-orbit-open-files]')?.addEventListener('click', () => {
      try { if (typeof toggleWorkspace === 'function') toggleWorkspace(); } catch {}
      closeSidebarOnMobile();
    });
    search.insertAdjacentElement('afterend', nav);
  }

  function enhanceSidebarLabels() {
    const heading = document.getElementById('chats-heading');
    if (heading) setText(heading, 'Recent chats');
  }

  function enhanceSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    setAttr(modal, 'data-stellar-orbit', 'v4');
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
    script.dataset.stellarAppSchema = 'safe-v4';
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
    safeRun(decorateMenu);
    safeRun(ensureSpaceStrip);
    safeRun(ensureOrbitPrimaryNav);
    safeRun(enhanceSidebarLabels);
    safeRun(enhanceSettings);
    safeRun(bindModelEvents);
    safeRun(syncLabel);
  }

  function init() {
    document.body.classList.add('stellar-orbit-v2', 'stellar-orbit-v3');
    safeRun(decorateMenu);
    safeRun(ensureSpaceStrip);
    safeRun(ensureOrbitPrimaryNav);
    safeRun(enhanceSidebarLabels);
    safeRun(enhanceSettings);
    safeRun(bindModelEvents);
    safeRun(syncLabel);
    safeRun(addSchema);
    window.addEventListener('focus', syncAll, { passive:true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAll(); });
    window.setInterval(syncAll, 2000);
    window.__stellarOrbitHealth = { version:'safe-v4', observers:0, startedAt:Date.now() };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();