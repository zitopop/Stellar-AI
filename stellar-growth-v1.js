(() => {
  'use strict';
  if (window.__stellarGrowthV1Safe) return;
  window.__stellarGrowthV1Safe = true;

  const LEVELS = [
    { key:'fabie', name:'Spark', mode:'Fast', icon:'✦', hint:'Quick answers and small fixes' },
    { key:'smart', name:'Star', mode:'Balanced', icon:'★', hint:'Best default for most builds', recommended:true },
    { key:'comet', name:'Comet', mode:'Deep', icon:'☄', hint:'More depth for hard debugging' },
    { key:'ultra', name:'Nova', mode:'Max', icon:'✺', hint:'Maximum Stellar effort', pro:true }
  ];
  const PROJECTS_KEY = 'stellar_orbit_projects_v1';
  const ACTIVE_PROJECT_KEY = 'stellar_orbit_active_project_v1';

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const setText = (node, value) => {
    if (!node) return;
    const next = String(value ?? '');
    if (node.textContent !== next) node.textContent = next;
  };
  const safeRun = (fn) => { try { fn(); } catch (error) { console.warn('[Stellar growth]', error); } };

  function currentLevelKey() {
    const checked = document.querySelector('#model-menu [data-model-choice][aria-checked="true"]');
    const key = checked?.getAttribute('data-model-choice');
    return LEVELS.some((x) => x.key === key) ? key : 'smart';
  }

  function levelFor(key = currentLevelKey()) {
    return LEVELS.find((x) => x.key === key) || LEVELS[1];
  }

  function syncReasoningControl() {
    const level = levelFor();
    document.querySelectorAll('[data-growth-level]').forEach((button) => {
      const active = button.dataset.growthLevel === level.key;
      if (button.getAttribute('aria-checked') !== String(active)) button.setAttribute('aria-checked', String(active));
      if (button.classList.contains('is-active') !== active) button.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-growth-current-mode]').forEach((n) => setText(n, level.mode));
    document.querySelectorAll('[data-growth-current-icon]').forEach((n) => setText(n, level.icon));
    document.querySelectorAll('[data-growth-current-name]').forEach((n) => setText(n, `${level.name} · ${level.mode}`));
    document.querySelectorAll('[data-growth-current-hint]').forEach((n) => setText(n, level.hint));
  }

  function selectLevel(key) {
    if (!LEVELS.some((x) => x.key === key)) return;
    let handled = false;
    try {
      if (typeof pickModel === 'function') {
        pickModel(key);
        handled = true;
      }
    } catch {}
    if (!handled) {
      const source = document.querySelector(`#model-menu [data-model-choice="${key}"]`);
      source?.click();
    }
    window.setTimeout(syncReasoningControl, 30);
  }

  function buildReasoningControl() {
    const menu = document.getElementById('model-menu');
    if (!menu || menu.querySelector('.stellar-reasoning-panel')) return;

    const heading = menu.querySelector('.model-menu-heading');
    if (heading) heading.innerHTML = '<span>Stellar AI</span><span>Choose power</span>';

    const panel = document.createElement('section');
    panel.className = 'stellar-reasoning-panel';
    panel.setAttribute('aria-label', 'Stellar reasoning level');
    panel.innerHTML = `
      <div class="stellar-reasoning-head">
        <div><small>REASONING</small><strong>How hard should Stellar work?</strong></div>
        <span data-growth-current-mode>Balanced</span>
      </div>
      <div class="stellar-reasoning-track" role="radiogroup" aria-label="Reasoning power">
        ${LEVELS.map((level) => `
          <button type="button" role="radio" aria-checked="false" data-growth-level="${level.key}" title="${esc(level.name)} · ${esc(level.mode)} — ${esc(level.hint)}">
            <span class="stellar-reasoning-dot">${level.icon}</span>
            <strong>${level.mode}</strong>
            <small>${level.name}</small>
            ${level.recommended ? '<em>Recommended</em>' : ''}
            ${level.pro ? '<em class="pro">Pro</em>' : ''}
          </button>`).join('')}
      </div>
      <div class="stellar-reasoning-summary" aria-live="polite">
        <span data-growth-current-icon>★</span>
        <div><strong data-growth-current-name>Star · Balanced</strong><small data-growth-current-hint>Best default for most builds</small></div>
      </div>
      <p class="stellar-reasoning-note">Higher power gives difficult Roblox and FiveM work more effort. These are Stellar tiers, not OpenAI models.</p>`;

    const oldLadder = menu.querySelector('.stellar-model-ladder');
    if (oldLadder) oldLadder.hidden = true;
    heading?.insertAdjacentElement('afterend', panel);

    panel.querySelectorAll('[data-growth-level]').forEach((button) => {
      button.addEventListener('click', () => selectLevel(button.dataset.growthLevel));
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('[data-model-choice]')) window.setTimeout(syncReasoningControl, 30);
    });
    menu.addEventListener('keydown', () => window.setTimeout(syncReasoningControl, 30));
    syncReasoningControl();
  }

  function readProjects() {
    try {
      const value = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
      return Array.isArray(value) ? value.filter((x) => x && x.id && x.name) : [];
    } catch { return []; }
  }

  function writeProjects(projects) {
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); } catch {}
  }

  function setActiveProject(id) {
    try {
      if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id);
      else localStorage.removeItem(ACTIVE_PROJECT_KEY);
    } catch {}
  }

  function getActiveProject() {
    try { return localStorage.getItem(ACTIVE_PROJECT_KEY); } catch { return null; }
  }

  function currentChatIdentifier() {
    try { if (typeof currentChatId !== 'undefined' && currentChatId) return currentChatId; } catch {}
    try { return window.Store?.get?.().currentChat || null; } catch { return null; }
  }

  function allChats() {
    try { if (typeof chats !== 'undefined' && Array.isArray(chats)) return chats; } catch {}
    try {
      const value = window.Store?.get?.().chats;
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function projectChat(id) {
    return allChats().find((chat) => chat.id === id) || null;
  }

  function createProject() {
    const raw = window.prompt('Name this Stellar project:', 'New build');
    const name = raw?.trim().slice(0, 48);
    if (!name) return;
    const projects = readProjects();
    const project = { id:`project_${Date.now()}`, name, icon:'🪐', chatIds:[], createdAt:Date.now() };
    projects.unshift(project);
    writeProjects(projects);
    setActiveProject(project.id);
    renderProjects();
    openProject(project.id);
  }

  function renderProjects() {
    const list = document.querySelector('[data-project-list]');
    if (!list) return;
    const projects = readProjects();
    const active = getActiveProject();
    const html = !projects.length
      ? '<button type="button" class="stellar-project-empty" data-create-first><span>＋</span><div><strong>New project</strong><small>Group chats and build context</small></div></button>'
      : projects.slice(0, 6).map((project) => `
        <button type="button" class="stellar-project-row ${active === project.id ? 'is-active' : ''}" data-project-id="${esc(project.id)}">
          <span class="stellar-project-icon" aria-hidden="true">${project.icon || '🪐'}</span>
          <span><strong>${esc(project.name)}</strong><small>${(project.chatIds || []).length} chat${(project.chatIds || []).length === 1 ? '' : 's'}</small></span>
          <span class="stellar-project-chevron">›</span>
        </button>`).join('');
    if (list.innerHTML !== html) list.innerHTML = html;
    list.querySelector('[data-create-first]')?.addEventListener('click', createProject);
    list.querySelectorAll('[data-project-id]').forEach((button) => {
      button.addEventListener('click', () => openProject(button.dataset.projectId));
    });
  }

  function ensureProjectsRail() {
    const side = document.getElementById('sidebar');
    if (!side || side.querySelector('.stellar-projects')) return;
    const heading = document.getElementById('chats-heading');
    if (!heading) return;
    const section = document.createElement('section');
    section.className = 'stellar-projects';
    section.setAttribute('aria-label', 'Projects');
    section.innerHTML = `
      <div class="stellar-projects-head"><span>Projects</span><button type="button" data-new-project aria-label="Create project" title="New project">＋</button></div>
      <div class="stellar-project-list" data-project-list></div>`;
    section.querySelector('[data-new-project]')?.addEventListener('click', createProject);
    heading.insertAdjacentElement('beforebegin', section);
    renderProjects();
  }

  function addCurrentChatToProject(projectId) {
    const chatId = currentChatIdentifier();
    if (!chatId) {
      window.alert('Start or open a chat first, then add it to a project.');
      return;
    }
    const projects = readProjects();
    const project = projects.find((x) => x.id === projectId);
    if (!project) return;
    project.chatIds ||= [];
    if (!project.chatIds.includes(chatId)) project.chatIds.unshift(chatId);
    writeProjects(projects);
    renderProjects();
    openProject(project.id);
  }

  function removeChatFromProject(projectId, chatId) {
    const projects = readProjects();
    const project = projects.find((x) => x.id === projectId);
    if (!project) return;
    project.chatIds = (project.chatIds || []).filter((id) => id !== chatId);
    writeProjects(projects);
    renderProjects();
    openProject(project.id);
  }

  function renameProject(projectId) {
    const projects = readProjects();
    const project = projects.find((x) => x.id === projectId);
    if (!project) return;
    const value = window.prompt('Rename project:', project.name)?.trim().slice(0, 48);
    if (!value) return;
    project.name = value;
    writeProjects(projects);
    renderProjects();
    openProject(project.id);
  }

  function deleteProject(projectId) {
    const projects = readProjects();
    const project = projects.find((x) => x.id === projectId);
    if (!project || !window.confirm(`Delete project “${project.name}”? Chats are kept.`)) return;
    writeProjects(projects.filter((x) => x.id !== projectId));
    if (getActiveProject() === projectId) setActiveProject(null);
    document.querySelector('.stellar-project-drawer')?.remove();
    renderProjects();
  }

  function openProject(projectId) {
    const project = readProjects().find((x) => x.id === projectId);
    if (!project) return;
    setActiveProject(project.id);
    renderProjects();

    let drawer = document.querySelector('.stellar-project-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'stellar-project-drawer';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      document.body.appendChild(drawer);
    }
    const projectChats = (project.chatIds || []).map(projectChat).filter(Boolean);
    drawer.innerHTML = `
      <div class="stellar-project-card">
        <header><div><small>STELLAR PROJECT</small><h2>${esc(project.name)}</h2></div><button type="button" data-close-project aria-label="Close project">×</button></header>
        <p class="stellar-project-copy">Keep related chats together so a long build is easier to return to. Project grouping is stored in this browser.</p>
        <div class="stellar-project-actions"><button type="button" data-add-current>＋ Add current chat</button><button type="button" data-new-project-chat>＋ New chat</button></div>
        <div class="stellar-project-chat-list">
          ${projectChats.length ? projectChats.map((chat) => `
            <div class="stellar-project-chat">
              <button type="button" data-open-project-chat="${esc(chat.id)}"><strong>${esc(chat.name || 'Untitled chat')}</strong><small>${esc(chat.messages?.at?.(-1)?.content?.slice?.(0, 70) || 'Open chat')}</small></button>
              <button type="button" data-remove-project-chat="${esc(chat.id)}" aria-label="Remove chat from project">×</button>
            </div>`).join('') : '<div class="stellar-project-nochats"><span>🪐</span><strong>No chats here yet</strong><small>Add the current chat or start a new one.</small></div>'}
        </div>
        <footer><button type="button" data-rename-project>Rename</button><button type="button" data-delete-project class="danger">Delete project</button></footer>
      </div>`;

    drawer.querySelector('[data-close-project]')?.addEventListener('click', () => drawer.remove());
    drawer.onclick = (event) => { if (event.target === drawer) drawer.remove(); };
    drawer.querySelector('[data-add-current]')?.addEventListener('click', () => addCurrentChatToProject(project.id));
    drawer.querySelector('[data-new-project-chat]')?.addEventListener('click', () => {
      try { if (typeof newChat === 'function') newChat(); } catch {}
      window.setTimeout(() => addCurrentChatToProject(project.id), 80);
      drawer.remove();
    });
    drawer.querySelectorAll('[data-open-project-chat]').forEach((button) => button.addEventListener('click', () => {
      try { if (typeof loadChat === 'function') loadChat(button.dataset.openProjectChat); } catch {}
      drawer.remove();
      if (window.innerWidth <= 767) { try { if (typeof toggleSidebar === 'function') toggleSidebar(); } catch {} }
    }));
    drawer.querySelectorAll('[data-remove-project-chat]').forEach((button) => button.addEventListener('click', () => removeChatFromProject(project.id, button.dataset.removeProjectChat)));
    drawer.querySelector('[data-rename-project]')?.addEventListener('click', () => renameProject(project.id));
    drawer.querySelector('[data-delete-project]')?.addEventListener('click', () => deleteProject(project.id));
  }

  function ensureUsageExperience() {
    const modal = document.getElementById('usage-modal');
    if (!modal) return;
    const card = modal.querySelector('.thanks-card') || modal.firstElementChild;
    if (!card || card.querySelector('.stellar-usage-overview')) return;
    const header = card.querySelector('.flex') || card.firstElementChild;
    const overview = document.createElement('section');
    overview.className = 'stellar-usage-overview';
    overview.innerHTML = `
      <div class="stellar-usage-title"><small>STELLAR USAGE & LIMITS</small><h3>Your allowance at a glance</h3><p>Model power and request limits are shown separately from credit.</p></div>
      <div class="stellar-usage-grid">
        <div class="stellar-usage-stat"><small>PLAN</small><strong data-growth-plan>Free</strong><span>Current workspace access</span></div>
        <div class="stellar-usage-stat"><small>REQUESTS</small><strong data-growth-requests>—</strong><span data-growth-reset>Reset timing</span></div>
        <div class="stellar-usage-stat"><small>MODEL POWER</small><strong data-growth-usage-model>Star · Balanced</strong><span>Current selection</span></div>
      </div>
      <div class="stellar-usage-models" aria-label="Stellar power availability">
        ${LEVELS.map((level) => `<span data-usage-tier="${level.key}"><b>${level.icon}</b><strong>${level.mode}</strong><small>${level.name}${level.pro ? ' · Pro' : ''}</small></span>`).join('')}
      </div>`;
    if (header) header.insertAdjacentElement('afterend', overview); else card.prepend(overview);
  }

  function syncUsageExperience() {
    ensureUsageExperience();
    const plan = document.getElementById('u-plan')?.textContent?.trim() || 'Free';
    const requestText = document.getElementById('u-pct')?.textContent?.trim() || '—';
    const reset = document.getElementById('u-reset')?.textContent?.trim() || 'Reset timing unavailable';
    const level = levelFor();
    document.querySelectorAll('[data-growth-plan]').forEach((n) => setText(n, plan));
    document.querySelectorAll('[data-growth-requests]').forEach((n) => setText(n, requestText.replace(' requests left', '')));
    document.querySelectorAll('[data-growth-reset]').forEach((n) => setText(n, reset));
    document.querySelectorAll('[data-growth-usage-model]').forEach((n) => setText(n, `${level.name} · ${level.mode}`));
    document.querySelectorAll('[data-usage-tier]').forEach((n) => {
      const active = n.dataset.usageTier === level.key;
      if (n.classList.contains('is-current') !== active) n.classList.toggle('is-current', active);
    });
  }

  function upgradeSidebarNewBuild() {
    const button = document.querySelector('#sidebar .side-new');
    if (!button) return;
    setText(button, 'New Build');
    button.setAttribute('title', 'Start a new Stellar build chat');
  }

  function addGrowthSchema() {
    if (document.querySelector('script[data-stellar-growth-schema]')) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.stellarGrowthSchema = 'safe-v2';
    script.textContent = JSON.stringify({
      '@context':'https://schema.org', '@type':'SoftwareApplication', name:'Stellar AI',
      url:'https://trystellarai.com/app', applicationCategory:'DeveloperApplication', operatingSystem:'Web',
      description:'AI Roblox Luau and FiveM development workspace with model power controls, project grouping, multi-file generation and iterative code fixes.'
    });
    document.head.appendChild(script);
  }

  function syncAll() {
    if (document.hidden) return;
    safeRun(buildReasoningControl);
    safeRun(ensureProjectsRail);
    safeRun(renderProjects);
    safeRun(syncReasoningControl);
    safeRun(syncUsageExperience);
    safeRun(upgradeSidebarNewBuild);
  }

  function init() {
    document.body.classList.add('stellar-growth-v1');
    safeRun(buildReasoningControl);
    safeRun(ensureProjectsRail);
    safeRun(ensureUsageExperience);
    safeRun(upgradeSidebarNewBuild);
    safeRun(syncReasoningControl);
    safeRun(syncUsageExperience);
    safeRun(addGrowthSchema);
    window.addEventListener('focus', syncAll, { passive:true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAll(); });
    window.setInterval(syncAll, 2000);
    window.__stellarGrowthHealth = { version:'safe-v2', observers:0, startedAt:Date.now() };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();