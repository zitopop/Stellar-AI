(() => {
  'use strict';

  if (window.__stellarSettingsExtensionsV6) return;
  window.__stellarSettingsExtensionsV6 = true;

  const STORAGE_KEY = 'stellar-ui-preferences-v1';
  const STREAK_KEY = 'stellar-daily-streak-v1';
  const SUPPORT_EMAIL = 'deadlyfox10@gmail.com';
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

  function safeText(selector, fallback = '') {
    try {
      const text = String(document.querySelector(selector)?.textContent || '').replace(/\s+/g, ' ').trim();
      return text && text !== '—' && text !== '?' ? text : fallback;
    } catch (_) { return fallback; }
  }

  function installLineMapStyles() {
    if (document.getElementById('stellar-settings-line-map-style')) return;
    const style = document.createElement('style');
    style.id = 'stellar-settings-line-map-style';
    style.textContent = `
      #settings-modal .stellar-line-map{
        display:grid!important;
        gap:10px!important;
        overflow:visible!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      #settings-modal .stellar-line-row{
        position:relative!important;
        display:grid!important;
        grid-template-columns:minmax(118px,180px) minmax(0,1fr)!important;
        gap:16px!important;
        align-items:start!important;
        min-height:72px!important;
        padding:15px 16px!important;
        border:1px solid var(--ms-line,rgba(199,189,255,.14))!important;
        border-radius:16px!important;
        background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.022))!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.035)!important;
      }
      #settings-modal .stellar-line-row + .stellar-line-row::before{display:none!important;}
      #settings-modal .stellar-line-name{
        min-width:0!important;
        color:var(--ms-text,#f7f7fb)!important;
        font-size:14px!important;
        font-weight:880!important;
        letter-spacing:-.018em!important;
        line-height:1.25!important;
      }
      #settings-modal .stellar-line-copy{
        min-width:0!important;
        display:grid!important;
        gap:7px!important;
        color:var(--ms-muted,#9aa0b4)!important;
        font-size:12px!important;
        line-height:1.45!important;
      }
      #settings-modal .stellar-line-copy span:first-child{
        min-width:0!important;
      }
      #settings-modal .stellar-line-pill{
        justify-self:start!important;
        display:inline-flex!important;
        align-items:center!important;
        min-height:26px!important;
        max-width:100%!important;
        padding:0 9px!important;
        overflow:hidden!important;
        border:1px solid rgba(126,232,209,.20)!important;
        border-radius:999px!important;
        background:rgba(126,232,209,.065)!important;
        color:#cafff3!important;
        font-size:10px!important;
        font-weight:900!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      #settings-modal .stellar-line-map.owner .stellar-line-pill{
        border-color:rgba(242,216,121,.24)!important;
        background:rgba(242,216,121,.07)!important;
        color:#f7e4a1!important;
      }
      body.light #settings-modal .stellar-line-row{
        border-color:rgba(0,0,0,.08)!important;
        background:#fafafa!important;
      }
      body.light #settings-modal .stellar-line-name{color:#25212b!important;}
      body.light #settings-modal .stellar-line-copy{color:#6d6876!important;}
      @media (max-width:767px){
        #settings-modal .stellar-line-map{gap:9px!important;}
        #settings-modal .stellar-line-row{
          grid-template-columns:1fr!important;
          gap:7px!important;
          min-height:86px!important;
          padding:14px!important;
        }
        #settings-modal .stellar-line-pill{max-width:100%!important;}
      }
    `;
    document.head.appendChild(style);
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

  function todayKey(date = new Date()) { return date.toISOString().slice(0, 10); }

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

  function isOwnerViewer() {
    const email = safeText('#acct-email,[data-account-email]', '');
    const body = document.body;
    const html = document.documentElement;
    return /deadlyfox10@gmail\.com/i.test(email)
      || body?.classList?.contains('owner')
      || body?.classList?.contains('is-owner')
      || html?.dataset?.owner === 'true'
      || body?.dataset?.owner === 'true'
      || document.querySelector('[data-owner-only],#provider-models,.owner-tools') !== null;
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

  function setStatus(message, tone = 'good') {
    try {
      const status = document.querySelector('.status,[data-status],#status,[role="status"]');
      if (!status) return;
      status.textContent = message;
      status.classList.remove('good', 'warn', 'error');
      status.classList.add(tone);
    } catch (_) {}
  }

  function clickFirst(selectors) {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node instanceof HTMLElement) {
        node.click();
        return true;
      }
    }
    return false;
  }

  function openTab(id) {
    if (typeof window.setTab === 'function') {
      window.setTab(id);
      return true;
    }
    return clickFirst([`#settings-modal [data-tab="${id}"]`]);
  }

  function commandAction(title, detail, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'stellar-command-action';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = detail;
    button.append(strong, span);
    button.addEventListener('click', handler);
    return button;
  }

  function commandCard(title, detail) {
    const card = document.createElement('div');
    card.className = 'stellar-command-card';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = detail;
    card.append(strong, span);
    return card;
  }

  function makeInfoRow(title, detail, className = 'stellar-trust-row') {
    const row = document.createElement('div');
    row.className = `set-item ${className}`;
    const key = document.createElement('div');
    key.className = 'set-key';
    key.textContent = title;
    const value = document.createElement('div');
    value.className = 'set-val';
    value.textContent = detail;
    row.append(key, value);
    return row;
  }

  function appendInfoGrid(panel, items, className = 'stellar-trust-grid') {
    const group = document.createElement('div');
    group.className = `set-group ${className}`;
    items.forEach(([title, detail]) => group.appendChild(makeInfoRow(title, detail)));
    panel.appendChild(group);
    return group;
  }

  function lineMapRow(title, detail, where = '') {
    const row = document.createElement('div');
    row.className = 'stellar-line-row';

    const name = document.createElement('div');
    name.className = 'stellar-line-name';
    name.textContent = title;

    const copy = document.createElement('div');
    copy.className = 'stellar-line-copy';

    const text = document.createElement('span');
    text.textContent = `What it does: ${detail}`;
    copy.appendChild(text);

    if (where) {
      const pill = document.createElement('span');
      pill.className = 'stellar-line-pill';
      pill.textContent = `Where: ${where}`;
      copy.appendChild(pill);
    }

    row.append(name, copy);
    return row;
  }

  function appendLineMap(panel, rows, mode = '') {
    installLineMapStyles();
    const group = document.createElement('div');
    group.className = `stellar-line-map ${mode}`.trim();
    rows.forEach(([title, detail, where]) => group.appendChild(lineMapRow(title, detail, where)));
    panel.appendChild(group);
    return group;
  }

  function copySupportEmail() {
    const done = () => setStatus(`Support email copied: ${SUPPORT_EMAIL}`, 'good');
    try {
      const result = navigator.clipboard?.writeText?.(SUPPORT_EMAIL);
      if (result?.then) result.then(done).catch(() => setStatus(SUPPORT_EMAIL, 'warn'));
      else setStatus(SUPPORT_EMAIL, 'warn');
    } catch (_) { setStatus(SUPPORT_EMAIL, 'warn'); }
  }

  function buildCommandCentre(panel) {
    const streak = readStreak();
    const plan = safeText('#plan-name,#acct-plan,[data-plan-name]', 'Free / current plan');
    const usage = safeText('#top-usage,.top-usage,[data-credit-pill]', 'Daily credits ready');
    const email = safeText('#acct-email,[data-account-email]', 'Signed-in account');

    const hero = document.createElement('div');
    hero.className = 'stellar-command-hero';
    hero.innerHTML = '<div class="stellar-command-kicker">Command centre</div><h3>Everything important in one clean place.</h3><p>Manage credits, plan, plugins, voice, privacy and support from one premium control room. Every card explains what it does so normal users are not guessing.</p>';
    panel.appendChild(hero);

    const stats = document.createElement('div');
    stats.className = 'stellar-command-grid';
    stats.append(
      commandCard('Account', `${email} — your sign-in, saved chats and billing identity.`),
      commandCard('Plan', `${plan} — controls model access, daily credits and paid features.`),
      commandCard('Credits', `${usage.replace(/^💳\s*/, '')} — daily credits refresh; wallet top-ups stay separate.`),
      commandCard('Daily streak', `Day ${streak.streak || 1} on this device — return rewards can encourage daily use.`),
    );
    panel.appendChild(stats);

    const row = document.createElement('div');
    row.className = 'stellar-command-row';
    row.innerHTML = '<div class="set-label">Quick controls</div><span class="stellar-command-pill">Approval-first</span>';
    panel.appendChild(row);

    const actions = document.createElement('div');
    actions.className = 'stellar-command-actions';
    actions.append(
      commandAction('Credits & rewards', 'See daily reset, welcome bonus, wallet top-ups and bonus logic.', () => openTab('credits-rewards')),
      commandAction('Manage plan', 'Open upgrades, billing and plan options.', () => { if (!clickFirst(['[data-open-plans]', '#plans-btn', '[data-tab="plans"]'])) location.href = '/app?upgrade=1'; }),
      commandAction('Plugins', 'Connect Gmail, GitHub, PC Agent and other tools safely.', () => { location.href = '/plugins'; }),
      commandAction('Voice / Jarvis', 'Tune mic, spoken replies, voice style and language.', () => { if (!openTab('voice')) setStatus('Voice settings are not available on this screen yet.', 'warn'); }),
      commandAction('What is what?', 'Open the separate line-by-line Settings guide.', () => openTab('settings-guide')),
      commandAction(isOwnerViewer() ? 'Owner perks' : 'Owner tools', isOwnerViewer() ? 'Open private owner controls and business perks.' : 'Owner-only tools stay hidden from normal users.', () => { if (!openTab('owner-perks')) setStatus('Owner perks only appear on the owner account.', 'warn'); }),
    );
    panel.appendChild(actions);
  }

  function buildSettingsGuide(panel) {
    addHeading(panel, 'What is what?', 'Every setting is now its own separate line: name, what it does, and where to press.');

    appendLineMap(panel, [
      ['Control', 'Main dashboard for your account, plan, credits and quick actions.', 'Settings > Control'],
      ['Account', 'Shows who is signed in, which email is active, and where saved chats/billing connect.', 'Account area'],
      ['Credits', 'Shows daily credits, wallet top-ups, welcome credits, bonuses and reset meaning.', 'Credits tab'],
      ['Plan', 'Explains the user’s tier, billing, upgrade path and unlocked features.', 'Plan / upgrade'],
      ['Models', 'Spark is quick, Star is default, Comet is deeper, Nova is Pro-level. Owner models stay hidden.', 'Model picker'],
      ['Voice', 'Mic, Jarvis/Ava voice, language, call-style controls and accessibility.', 'Voice tab'],
      ['Plugins', 'External tools like Gmail, GitHub, Vercel or PC Agent. High-impact actions should ask first.', 'Plugins page'],
      ['Devices / StellarX', 'Connected PC or desktop-agent features. Only use devices the user owns.', 'PC Agent'],
      ['Privacy', 'Data controls, legal pages, delete/export guidance and safety information.', 'Privacy page'],
      ['Support', 'Billing, refunds, account help and support email copy action.', 'Support action'],
      ['Owner perks', 'Private admin/business controls for the owner only. Not for normal users.', 'Owner tab'],
    ]);

    const note = document.createElement('div');
    note.className = 'set-note stellar-pref-note';
    note.textContent = 'This is meant to read line by line, not as one big mixed block. Each row explains one thing only.';
    panel.appendChild(note);
  }

  function buildOwnerPerks(panel) {
    addHeading(panel, 'Owner perks', 'Private controls for the account owner: business growth, deployments, agents, plugins and safer high-power tools.');

    const hero = document.createElement('div');
    hero.className = 'stellar-command-hero';
    hero.innerHTML = '<div class="stellar-command-kicker">Owner only</div><h3>Run Stellar like a business.</h3><p>These are admin perks for the owner account. Normal users should not see private models, provider tools, revenue controls or desktop-agent permissions.</p>';
    panel.appendChild(hero);

    appendLineMap(panel, [
      ['Private owner models', 'Experimental/provider models for admin testing. Hide these from normal users.', 'Owner only'],
      ['StellarX / PC Agent', 'Pair your own computer, inspect files and approve edits or terminal actions.', 'Open PC Agent'],
      ['GitHub + Vercel', 'Check repo changes, deployments, build errors and live status from one workflow.', 'Dev tools'],
      ['Revenue controls', 'Monitor plans, credits, checkout readiness, Stripe context and support issues.', 'Business ops'],
      ['Growth automations', 'SEO, lead follow-up and inbox workflows; keep sending approval-first.', 'Revenue bot farm'],
      ['Plugin testing', 'Try Gmail, GitHub, Vercel and future connectors before exposing them publicly.', 'Plugins'],
      ['Safety gate', 'High-impact actions need approval, clear logs and no hidden sending/deleting.', 'Approval-first'],
      ['Business polish', 'Keep Terms, Privacy, pricing, support and plan copy aligned.', 'Public pages'],
    ], 'owner');

    const row = document.createElement('div');
    row.className = 'stellar-command-row';
    row.innerHTML = '<div class="set-label">Owner shortcuts</div><span class="stellar-command-pill">Private</span>';
    panel.appendChild(row);

    const actions = document.createElement('div');
    actions.className = 'stellar-command-actions';
    actions.append(
      commandAction('Open plugins', 'Manage connected tools and see how to get each plugin.', () => { location.href = '/plugins'; }),
      commandAction('Open PC Agent', 'Pair or check your StellarX desktop workflow.', () => { location.href = '/desktop'; }),
      commandAction('Credits setup', 'Review daily credits, welcome bonus and top-up packs.', () => openTab('credits-rewards')),
      commandAction('Trust checklist', 'Check public safety, privacy and support controls.', () => openTab('trust-checklist')),
    );
    panel.appendChild(actions);
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
    addHeading(panel, 'Credits & rewards', 'Daily credits are the free/plan allowance. Wallet credits are bought top-ups and stay separate.');

    const group = document.createElement('div');
    group.className = 'set-group stellar-rewards-group';
    group.innerHTML = `
      <div class="set-item stellar-reward-row"><div class="set-key">Daily reset</div><div class="set-val">Free 300/day · Starter 900/day · Plus 2,500/day · Pro 8,000/day</div></div>
      <div class="set-item stellar-reward-row"><div class="set-key">Welcome bonus</div><div class="set-val">500 one-time credits for new accounts</div></div>
      <div class="set-item stellar-reward-row"><div class="set-key">Streak idea</div><div class="set-val">Day ${streak.streak || 1} on this device · suggested server rewards: Day 2 +50, Day 3 +75, Day 7 +150</div></div>
      <div class="set-item stellar-reward-row"><div class="set-key">Top-ups</div><div class="set-val">£3, £5, £10, £25, £50+ with bigger bonuses only on bigger packs</div></div>
    `;
    panel.appendChild(group);

    const note = document.createElement('div');
    note.className = 'set-note stellar-pref-note';
    note.textContent = 'Daily credits keep people coming back. Bought wallet credits should not reset. That protects your costs while still making the app feel generous.';
    panel.appendChild(note);
  }

  function buildTrustChecklist(panel) {
    addHeading(panel, 'Trust & safety', 'A premium AI workspace needs clear controls, safe approvals and no confusing owner-only tools for normal users.');
    appendLineMap(panel, [
      ['Account', 'Show email, sign-in state and sign-out clearly.', 'Account'],
      ['Credits', 'Show daily allowance, wallet balance and reset meaning.', 'Credits'],
      ['Plan', 'Show current plan, upgrade path and billing help.', 'Plan'],
      ['Models', 'Show only models the user can actually use. Hide owner/provider tools.', 'Models'],
      ['Voice', 'Explain Jarvis/Ava, mic access, language and call controls.', 'Voice'],
      ['Privacy', 'Make export, delete, cookies and legal pages easy to find.', 'Privacy'],
      ['Devices', 'Explain StellarX/PC Agent approvals and connected-device safety.', 'Devices'],
      ['Support', 'Copy support email and explain billing/refund/account help.', 'Support'],
    ]);
  }

  function registerSection(config) {
    if (!config || !/^[a-z0-9-]+$/.test(config.id || '') || typeof config.build !== 'function') return false;
    if (!document.querySelector('#settings-modal .set-tabs') || !document.querySelector('#settings-modal .set-body')) return false;
    makeTab(config);
    makePanel(config);
    return true;
  }

  function registerCommandCentre() {
    return registerSection({ id: 'command-centre', label: 'Control', icon: '✦', build: buildCommandCentre });
  }

  function registerGuide() {
    return registerSection({ id: 'settings-guide', label: 'Guide', icon: '?', build: buildSettingsGuide });
  }

  function registerOwnerPerks() {
    if (!isOwnerViewer()) return false;
    return registerSection({ id: 'owner-perks', label: 'Owner', icon: '♛', build: buildOwnerPerks });
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
    isOwnerViewer,
  });

  function init() {
    installLineMapStyles();
    applyPrefs();
    registerCommandCentre();
    registerGuide();
    registerOwnerPerks();
    registerPreferences();
    registerRewards();
    registerTrustChecklist();
    window.setTimeout(registerOwnerPerks, 650);
    window.setTimeout(registerOwnerPerks, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();