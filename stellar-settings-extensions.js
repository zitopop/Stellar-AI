(() => {
  'use strict';

  if (window.__stellarSettingsExtensionsV2) return;
  window.__stellarSettingsExtensionsV2 = true;

  const STORAGE_KEY = 'stellar-ui-preferences-v1';
  const STREAK_KEY = 'stellar-daily-streak-v1';
  const DEFAULTS = Object.freeze({
    sidebarDensity: 'comfortable',
    codeWrap: true,
    reducedMotion: false,
  });

  function readStorage(key, fallback = '') {
    try { return window.safeStorageGet ? window.safeStorageGet(key) : localStorage.getItem(key); } catch (_) { return fallback; }
  }

  function writeStorage(key, value) {
    try { return window.safeStorageSet ? window.safeStorageSet(key, value) : localStorage.setItem(key, value); } catch (_) { return false; }
  }

  function removeStorage(key) {
    try { return window.safeStorageRemove ? window.safeStorageRemove(key) : localStorage.removeItem(key); } catch (_) { return false; }
  }

  function readPrefs() {
    try {
      const stored = JSON.parse(readStorage(STORAGE_KEY, '{}') || '{}');
      return { ...DEFAULTS, ...(stored && typeof stored === 'object' ? stored : {}) };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  function applyPrefs(prefs = readPrefs()) {
    document.body.classList.toggle('stellar-sidebar-compact', prefs.sidebarDensity === 'compact');
    document.body.classList.toggle('stellar-code-wrap', prefs.codeWrap !== false);
    document.body.classList.toggle('stellar-reduce-motion', prefs.reducedMotion === true);
  }

  function writePrefs(next) {
    const merged = { ...readPrefs(), ...next };
    writeStorage(STORAGE_KEY, JSON.stringify(merged));
    applyPrefs(merged);
    return merged;
  }

  function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function readStreak() {
    let stored = {};
    try { stored = JSON.parse(readStorage(STREAK_KEY, '{}') || '{}') || {}; } catch (_) { stored = {}; }
    const today = todayKey();
    if (stored.last === today) return stored;
    const yesterday = todayKey(new Date(Date.now() - 86400000));
    const streak = stored.last === yesterday ? Math.min(30, Number(stored.streak || 0) + 1) : 1;
    const next = { last: today, streak };
    writeStorage(STREAK_KEY, JSON.stringify(next));
    return next;
  }

  function makeTab({ id, label, icon = '⚙' }) {
    const tabs = document.querySelector('#settings-modal .set-tabs');
    if (!tabs || tabs.querySelector(`[data-tab="${id}"]`)) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'set-tab stellar-ext-tab';
    button.dataset.tab = id;
    button.setAttribute('aria-label', label);

    const iconNode = document.createElement('i');
    iconNode.className = 'stellar-ext-tab-icon';
    iconNode.setAttribute('aria-hidden', 'true');
    iconNode.textContent = icon;

    const textNode = document.createElement('span');
    textNode.textContent = label;
    button.append(iconNode, textNode);

    button.addEventListener('click', () => {
      if (typeof window.setTab === 'function') window.setTab(id);
    });

    const aboutTab = tabs.querySelector('[data-tab="about"]');
    tabs.insertBefore(button, aboutTab || null);
    return button;
  }

  function makePanel({ id, build }) {
    const body = document.querySelector('#settings-modal .set-body');
    if (!body || body.querySelector(`[data-panel="${id}"]`)) return null;

    const panel = document.createElement('div');
    panel.className = 'set-panel stellar-ext-panel';
    panel.dataset.panel = id;
    panel.style.display = 'none';
    build(panel);

    const aboutPanel = body.querySelector('[data-panel="about"]');
    body.insertBefore(panel, aboutPanel || null);
    return panel;
  }

  function createSegment(label, values, current, onChange) {
    const row = document.createElement('div');
    row.className = 'set-item stellar-pref-row';

    const key = document.createElement('div');
    key.className = 'set-key';
    key.textContent = label;

    const group = document.createElement('div');
    group.className = 'seg-wrap stellar-pref-segments';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);

    const buttons = [];
    values.forEach(({ value, text }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `seg${Object.is(value, current) ? ' active' : ''}`;
      button.textContent = text;
      button.setAttribute('aria-pressed', String(Object.is(value, current)));
      button.addEventListener('click', () => {
        buttons.forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        onChange(value);
      });
      buttons.push(button);
      group.appendChild(button);
    });

    row.append(key, group);
    return row;
  }

  function addHeading(panel, titleText, subtitleText) {
    const heading = document.createElement('div');
    heading.className = 'stellar-pref-heading';
    const title = document.createElement('strong');
    title.textContent = titleText;
    const subtitle = document.createElement('span');
    subtitle.textContent = subtitleText;
    heading.append(title, subtitle);
    panel.appendChild(heading);
    return heading;
  }

  function buildPreferences(panel) {
    const prefs = readPrefs();
    addHeading(panel, 'Preferences', 'Make Stellar comfortable for the way you work. These choices stay on this device.');

    const label = document.createElement('div');
    label.className = 'set-label';
    label.textContent = 'Workspace';
    panel.appendChild(label);

    const group = document.createElement('div');
    group.className = 'set-group';

    group.appendChild(createSegment('Sidebar density', [
      { value: 'comfortable', text: 'Comfortable' },
      { value: 'compact', text: 'Compact' },
    ], prefs.sidebarDensity, (value) => writePrefs({ sidebarDensity: value })));

    group.appendChild(createSegment('Code wrapping', [
      { value: true, text: 'Wrap' },
      { value: false, text: 'Scroll' },
    ], prefs.codeWrap !== false, (value) => writePrefs({ codeWrap: value })));

    group.appendChild(createSegment('Motion', [
      { value: false, text: 'Full' },
      { value: true, text: 'Reduced' },
    ], prefs.reducedMotion === true, (value) => writePrefs({ reducedMotion: value })));

    panel.appendChild(group);

    const note = document.createElement('div');
    note.className = 'set-note stellar-pref-note';
    note.textContent = 'Reduced motion improves accessibility. Code wrapping helps long Lua and Luau lines fit smaller windows.';
    panel.appendChild(note);

    const actions = document.createElement('div');
    actions.className = 'stellar-pref-actions';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'stellar-pref-reset';
    reset.textContent = 'Reset UI preferences';
    reset.addEventListener('click', () => {
      removeStorage(STORAGE_KEY);
      applyPrefs(DEFAULTS);
      document.querySelector('#settings-modal .set-tabs [data-tab="preferences"]')?.remove();
      panel.remove();
      registerPreferences();
      if (typeof window.setTab === 'function') window.setTab('preferences');
    });

    actions.appendChild(reset);
    panel.appendChild(actions);
  }

  function buildCreditsRewards(panel) {
    const streak = readStreak();
    addHeading(panel, 'Credits & rewards', 'Daily credits should feel generous, clear and safe from abuse. Wallet top-ups stay separate.');

    const group = document.createElement('div');
    group.className = 'set-group stellar-rewards-group';
    group.innerHTML = `
      <div class="set-item stellar-reward-row"><div class="set-key">Daily reset</div><div class="set-val">Free 300/day · Starter 900/day · Plus 2,500/day · Pro 8,000/day</div></div>
      <div class="set-item stellar-reward-row"><div class="set-key">Welcome bonus</div><div class="set-val">500 one-time credits for new accounts</div></div>
      <div class="set-item stellar-reward-row"><div class="set-key">Streak idea</div><div class="set-val">Day ${streak.streak || 1} on this device · server rewards should be Day 2 +50, Day 3 +75, Day 7 +150</div></div>
      <div class="set-item stellar-reward-row"><div class="set-key">Top-ups</div><div class="set-val">£3, £5, £10, £25, £50+ with bigger bonuses only on bigger packs</div></div>
    `;
    panel.appendChild(group);

    const note = document.createElement('div');
    note.className = 'set-note stellar-pref-note';
    note.textContent = 'Do not give huge free credits forever. Use daily allowance, welcome bonus, and small streak rewards so people come back without burning money.';
    panel.appendChild(note);
  }

  function buildTrustChecklist(panel) {
    addHeading(panel, 'Settings checklist', 'The app should feel safe, simple and premium. These are the controls normal users need.');
    const group = document.createElement('div');
    group.className = 'set-group stellar-trust-grid';
    const items = [
      ['Account', 'Email, sign-in state, sign out'],
      ['Credits', 'Daily allowance, wallet balance, reset time'],
      ['Plan', 'Current plan, upgrade, billing help'],
      ['Models', 'Allowed models only, no owner tools'],
      ['Voice', 'Jarvis/Ava controls and language'],
      ['Privacy', 'Export, delete, data controls'],
      ['Devices', 'StellarX approvals and connected PC'],
      ['Support', 'Copy email, refund/billing help'],
    ];
    items.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'set-item stellar-trust-row';
      row.innerHTML = `<div class="set-key">${key}</div><div class="set-val">${value}</div>`;
      group.appendChild(row);
    });
    panel.appendChild(group);
  }

  function registerSection(config) {
    if (!config || !/^[a-z0-9-]+$/.test(config.id || '') || typeof config.build !== 'function') return false;
    if (!document.querySelector('#settings-modal .set-tabs') || !document.querySelector('#settings-modal .set-body')) return false;
    makeTab(config);
    makePanel(config);
    return true;
  }

  function registerPreferences() {
    return registerSection({ id: 'preferences', label: 'Preferences', icon: '⚙', build: buildPreferences });
  }

  function registerRewards() {
    return registerSection({ id: 'credits-rewards', label: 'Credits', icon: '💳', build: buildCreditsRewards });
  }

  function registerTrustChecklist() {
    return registerSection({ id: 'trust-checklist', label: 'Trust', icon: '✓', build: buildTrustChecklist });
  }

  window.StellarSettingsExtensions = Object.freeze({
    registerSection,
    getPreferences: readPrefs,
    setPreferences: writePrefs,
    applyPreferences: applyPrefs,
    getDailyStreak: readStreak,
  });

  function init() {
    applyPrefs();
    registerPreferences();
    registerRewards();
    registerTrustChecklist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();