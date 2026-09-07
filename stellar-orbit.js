(() => {
  'use strict';
  if (window.__stellarOrbitV3) return;
  window.__stellarOrbitV3 = true;

  const TIERS = Object.freeze({
    fabie:  { name:'Spark', mode:'Fast',     symbol:'✦', desc:'Quick drafts, small fixes and lightweight work.', power:1 },
    smart:  { name:'Star',  mode:'Balanced', symbol:'★', desc:'Recommended for most Roblox and FiveM builds.', power:2, recommended:true },
    comet:  { name:'Comet', mode:'Deep',     symbol:'☄', desc:'Architecture, debugging and larger multi-file systems.', power:3 },
    ultra:  { name:'Nova',  mode:'Max',      symbol:'✺', desc:'Highest-capability Stellar tier for difficult project work.', power:4, pro:true }
  });

  const state = { selected:'smart', syncing:false };

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
    Object.entries(TIERS).forEach(([key, t]) => {
      const button = document.querySelector(`#model-menu [data-model-choice="${key}"]`);
      if (!button) return;
      button.dataset.stellarTier = t.mode.toLowerCase();
      button.dataset.stellarPower = String(t.power);
      button.setAttribute('aria-label', `Select ${t.name} — ${t.mode}. ${t.desc}${t.pro ? ' Pro plan.' : ''}`);
      button.setAttribute('title', `${t.name} · ${t.mode} — ${t.desc}`);
      const copy = button.firstElementChild;
      if (copy && !copy.querySelector('.stellar-model-line')) copy.innerHTML = tierMarkup(key);
    });
  }

  function updatePowerUI(tier) {
    document.querySelectorAll('[data-stellar-power-meter]').forEach(meter => {
      meter.querySelectorAll('span').forEach((bar, index) => bar.classList.toggle('is-on', index < tier.power));
    });
    document.querySelectorAll('.stellar-model-ladder').forEach(ladder => {
      ladder.querySelectorAll('span').forEach((bar, index) => {
        bar.classList.toggle('is-on', index < tier.power);
        bar.classList.toggle('is-current', index === tier.power - 1);
      });
    });
    document.querySelectorAll('[data-stellar-power-label]').forEach(n => n.textContent = `${tier.mode} power`);
  }

  function decorateMenu() {
    const menu = document.getElementById('model-menu');
    if (!menu) return;
    menu.setAttribute('aria-label', 'Choose Stellar model power');

    const heading = menu.querySelector('.model-menu-heading');
    if (heading) heading.innerHTML = '<span>Model power</span><span>Fast → Max depth</span>';

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
      const plans = [...menu.querySelectorAll('button')].find(b => /see all plans/i.test(b.textContent || ''));
      if (plans) plans.insertAdjacentElement('beforebegin', note);
      else menu.appendChild(note);
    }

    decorateTierButtons();
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
          <span class="stellar-orbit-primary-meta">66</span>
        </a>
      </div>`;

    nav.querySelector('[data-orbit-open-model]')?.addEventListener('click', openModelPickerFromOrbit);
    nav.querySelector('[data-orbit-open-files]')?.addEventListener('click', () => {
      try { window.toggleWorkspace?.(); } catch {}
      closeSidebarOnMobile();
    });
    search.insertAdjacentElement('afterend', nav);
  }

  function enhanceSidebarLabels() {
    const heading = document.getElementById('chats-heading');
    if (heading) heading.textContent = 'Recent chats';
  }

  function closeSidebarOnMobile() {
    if (window.innerWidth > 767) return;
    const toggle = document.getElementById('mobile-menu-toggle');
    const expanded = toggle?.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      try { window.toggleSidebar?.(); } catch {}
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
        const selected = menu.querySelector('[data-model-choice][aria-checked="true"]');
        selected?.focus({ preventScroll:true });
      }, 30);
    };
    window.setTimeout(open, window.innerWidth <= 767 ? 170 : 0);
  }

  function enhanceSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.setAttribute('data-stellar-orbit', 'v3');
    const subtitle = modal.querySelector('.settings-subtitle');
    if (subtitle) subtitle.textContent = 'Your Stellar workspace, model power, appearance, usage and account controls.';

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
      try { window.closeSettings?.(); } catch {}
      window.setTimeout(openModelPickerFromOrbit, 50);
    });
    hero.querySelector('[data-orbit-usage]')?.addEventListener('click', () => {
      try { window.closeSettings?.(); window.openUsage?.(); } catch {}
    });
    hero.querySelector('[data-orbit-plans]')?.addEventListener('click', () => {
      try { window.closeSettings?.(); window.openPlans?.(); } catch {}
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
      button.textContent = text;
      button.setAttribute('aria-label', `Choose Stellar model power. Current: ${tier.name}, ${tier.mode}.`);
      button.setAttribute('title', `${tier.name} · ${tier.mode}`);
      state.syncing = false;
    }

    document.querySelectorAll('[data-stellar-model]').forEach(n => n.textContent = `${tier.name} · ${tier.mode}`);
    document.querySelectorAll('[data-stellar-side-model]').forEach(n => n.textContent = `${tier.name} · ${tier.mode}`);
    document.querySelectorAll('[data-stellar-settings-model]').forEach(n => n.textContent = `${tier.name} · ${tier.mode}`);
    document.querySelectorAll('[data-stellar-depth]').forEach(n => n.textContent = tier.mode);
    updatePowerUI(tier);
  }

  function observe() {
    const menu = document.getElementById('model-menu');
    const button = document.getElementById('model-btn');
    if (menu) {
      new MutationObserver(() => {
        decorateTierButtons();
        syncLabel();
      }).observe(menu, { subtree:true, attributes:true, attributeFilter:['aria-checked'] });
    }
    if (button) {
      new MutationObserver(() => {
        if (!state.syncing) syncLabel();
      }).observe(button, { childList:true, characterData:true, subtree:true });
    }
    const settings = document.getElementById('settings-modal');
    if (settings) new MutationObserver(() => enhanceSettings()).observe(settings, { subtree:true, childList:true });
  }

  function addSchema() {
    if (document.querySelector('script[data-stellar-app-schema]')) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.stellarAppSchema = 'v3';
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

  function init() {
    document.body.classList.add('stellar-orbit-v2', 'stellar-orbit-v3');
    decorateMenu();
    ensureSpaceStrip();
    ensureOrbitPrimaryNav();
    enhanceSidebarLabels();
    enhanceSettings();
    syncLabel();
    observe();
    addSchema();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
