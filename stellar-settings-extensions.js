(() => {
  'use strict';

  if (window.__stellarSettingsExtensionsV1) return;
  window.__stellarSettingsExtensionsV1 = true;

  const STORAGE_KEY = 'stellar-ui-preferences-v1';
  const DEFAULTS = Object.freeze({
    sidebarDensity: 'comfortable',
    codeWrap: true,
    reducedMotion: false,
  });

  function readPrefs() {
    try {
      const stored = JSON.parse(window.safeStorageGet(STORAGE_KEY) || '{}');
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
    window.safeStorageSet(STORAGE_KEY, JSON.stringify(merged));
    applyPrefs(merged);
    return merged;
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

  function buildPreferences(panel) {
    const prefs = readPrefs();

    const heading = document.createElement('div');
    heading.className = 'stellar-pref-heading';
    const title = document.createElement('strong');
    title.textContent = 'Preferences';
    const subtitle = document.createElement('span');
    subtitle.textContent = 'Make Stellar comfortable for the way you work. These choices stay on this device.';
    heading.append(title, subtitle);
    panel.appendChild(heading);

    const label = document.createElement('div');
    label.className = 'set-label';
    label.textContent = 'Workspace';
    panel.appendChild(label);

    const group = document.createElement('div');
    group.className = 'set-group';

    group.appendChild(createSegment(
      'Sidebar density',
      [
        { value: 'comfortable', text: 'Comfortable' },
        { value: 'compact', text: 'Compact' },
      ],
      prefs.sidebarDensity,
      (value) => writePrefs({ sidebarDensity: value }),
    ));

    group.appendChild(createSegment(
      'Code wrapping',
      [
        { value: true, text: 'Wrap' },
        { value: false, text: 'Scroll' },
      ],
      prefs.codeWrap !== false,
      (value) => writePrefs({ codeWrap: value }),
    ));

    group.appendChild(createSegment(
      'Motion',
      [
        { value: false, text: 'Full' },
        { value: true, text: 'Reduced' },
      ],
      prefs.reducedMotion === true,
      (value) => writePrefs({ reducedMotion: value }),
    ));

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
      window.safeStorageRemove(STORAGE_KEY);
      applyPrefs(DEFAULTS);
      document.querySelector('#settings-modal .set-tabs [data-tab="preferences"]')?.remove();
      panel.remove();
      registerPreferences();
      if (typeof window.setTab === 'function') window.setTab('preferences');
    });

    actions.appendChild(reset);
    panel.appendChild(actions);
  }

  function registerSection(config) {
    if (!config || !/^[a-z0-9-]+$/.test(config.id || '') || typeof config.build !== 'function') return false;
    if (!document.querySelector('#settings-modal .set-tabs') || !document.querySelector('#settings-modal .set-body')) return false;
    makeTab(config);
    makePanel(config);
    return true;
  }

  function registerPreferences() {
    return registerSection({
      id: 'preferences',
      label: 'Preferences',
      icon: '⚙',
      build: buildPreferences,
    });
  }

  window.StellarSettingsExtensions = Object.freeze({
    registerSection,
    getPreferences: readPrefs,
    setPreferences: writePrefs,
    applyPreferences: applyPrefs,
  });

  function init() {
    applyPrefs();
    registerPreferences();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
