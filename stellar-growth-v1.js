(() => {
  'use strict';
  if (window.__stellarGrowthV1) return;
  window.__stellarGrowthV1 = true;

  const LEVELS = [
    { key:'fabie',  name:'Spark', mode:'Fast',     icon:'✦', hint:'Quick answers and small fixes' },
    { key:'smart',  name:'Star',  mode:'Balanced', icon:'★', hint:'Best default for most builds', recommended:true },
    { key:'comet',  name:'Comet', mode:'Deep',     icon:'☄', hint:'More depth for hard debugging' },
    { key:'ultra',  name:'Nova',  mode:'Max',      icon:'✺', hint:'Maximum Stellar effort', pro:true }
  ];
  const PROJECTS_KEY = 'stellar_orbit_projects_v1';
  const ACTIVE_PROJECT_KEY = 'stellar_orbit_active_project_v1';

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function currentLevelKey() {
    const checked = document.querySelector('#model-menu [data-model-choice][aria-checked="true"]');
    const key = checked?.getAttribute('data-model-choice');
    return LEVELS.some(x => x.key === key) ? key : 'smart';
  }

  function levelFor(key=currentLevelKey()) {
    return LEVELS.find(x => x.key === key) || LEVELS[1];
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
        ${LEVELS.map(level => `
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
      <p class="stellar-reasoning-note">Like a reasoning control: higher power gives difficult Roblox and FiveM work more effort. These are Stellar tiers, not OpenAI models.</p>`;

    const oldLadder = menu.querySelector('.stellar-model-ladder');
    if (oldLadder) oldLadder.hidden = true;
    heading?.insertAdjacentElement('afterend', panel);

    LEVELS.forEach(level => {
      panel.querySelector(`[data-growth-level="${level.key}"]`)?.addEventListener('click', () => {
        try { window.pickModel?.(level.key); }
        catch { document.querySelector(`#model-menu [data-model-choice="${level.key}"]`)?.click(); }
        setTimeout(syncReasoningControl, 20);
      });
      const source = menu.querySelector(`[data-model-choice="${level.key}"]`);
      if (source) source.classList.add('stellar-tier-source');
    });
    syncReasoningControl();
  }

  function syncReasoningControl() {
    const level = levelFor();
    document.querySelectorAll('[data-growth-level]').forEach(button => {
      const active = button.dataset.growthLevel === level.key;
      button.setAttribute('aria-checked', String(active));
      button.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-growth-current-mode]').forEach(n => n.textContent = level.mode);
    document.querySelectorAll('[data-growth-current-icon]').forEach(n => n.textContent = level.icon);
    document.querySelectorAll('[data-growth-current-name]').forEach(n => n.textContent = `${level.name} · ${level.mode}`);
    document.querySelectorAll('[data-growth-current-hint]').forEach(n => n.textContent = level.hint);
  }

  function readProjects() {
    try {
      const value = JSON.parse(window.safeStorageGet(PROJECTS_KEY) || '[]');
      return Array.isArray(value) ? value.filter(x => x && x.id && x.name) : [];
    } catch { return []; }
  }

  function writeProjects(projects) {
    window.safeStorageSet(PROJECTS_KEY, JSON.stringify(projects));
  }

  function currentChatIdentifier() {
    try { if (typeof currentChatId !== 'undefined' && currentChatId) return currentChatId; } catch {}
    try { return Store?.get?.().currentChat || null; } catch { return null; }
  }

  function allChats() {
    try {
      const value = Store?.get?.().chats;
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function projectChat(project, id) {
    return allChats().find(chat => chat.id === id) || null;
  }

  function createProject() {
    const raw = prompt('Name this Stellar project:', 'New build');
    const name = raw?.trim().slice(0, 48);
    if (!name) return;
    const projects = readProjects();
    const project = { id:`project_${Date.now()}`, name, icon:'🪐', chatIds:[], createdAt:Date.now() };
    projects.unshift(project);
    writeProjects(projects);
    window.safeStorageSet(ACTIVE_PROJECT_KEY, project.id);
    renderProjects();
    openProject(project.id);
  }

  function addCurrentChatToProject(projectId) {
    const chatId = currentChatIdentifier();
    if (!chatId) {
      alert('Start or open a chat first, then add it to a project.');
      return;
    }
    const projects = readProjects();
    const project = projects.find(x => x.id === projectId);
    if (!project) return;
    project.chatIds ||= [];
    if (!project.chatIds.includes(chatId)) project.chatIds.unshift(chatId);
    writeProjects(projects);
    renderProjects();
    openProject(project.id);
  }

  function removeChatFromProject(projectId, chatId) {
    const projects = readProjects();
    const project = projects.find(x => x.id === projectId);
    if (!project) return;
    project.chatIds = (project.chatIds || []).filter(id => id !== chatId);
    writeProjects(projects);
    renderProjects();
    openProject(project.id);
  }

  function renameProject(projectId) {
    const projects = readProjects();
    const project = projects.find(x => x.id === projectId);
    if (!project) return;
    const value = prompt('Rename project:', project.name)?.trim().slice(0,48);
    if (!value) return;
    project.name = value;
    writeProjects(projects);
    renderProjects();
    openProject(project.id);
  }

  function deleteProject(projectId) {
    const projects = readProjects();
    const project = projects.find(x => x.id === projectId);
    if (!project || !confirm(`Delete project “${project.name}”? Chats are kept.`)) return;
    writeProjects(projects.filter(x => x.id !== projectId));
    if (window.safeStorageGet(ACTIVE_PROJECT_KEY) === projectId) window.safeStorageRemove(ACTIVE_PROJECT_KEY);
    document.querySelector('.stellar-project-drawer')?.remove();
    renderProjects();
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

  function renderProjects() {
    const list = document.querySelector('[data-project-list]');
    if (!list) return;
    const projects = readProjects();
    const active = window.safeStorageGet(ACTIVE_PROJECT_KEY);
    if (!projects.length) {
      list.innerHTML = '<button type="button" class="stellar-project-empty" data-create-first><span>＋</span><div><strong>New project</strong><small>Group chats and build context</small></div></button>';
      list.querySelector('[data-create-first]')?.addEventListener('click', createProject);
      return;
    }
    list.innerHTML = projects.slice(0,6).map(project => `
      <button type="button" class="stellar-project-row ${active === project.id ? 'is-active' : ''}" data-project-id="${esc(project.id)}">
        <span class="stellar-project-icon" aria-hidden="true">${project.icon || '🪐'}</span>
        <span><strong>${esc(project.name)}</strong><small>${(project.chatIds || []).length} chat${(project.chatIds || []).length === 1 ? '' : 's'}</small></span>
        <span class="stellar-project-chevron">›</span>
      </button>`).join('');
    list.querySelectorAll('[data-project-id]').forEach(button => button.addEventListener('click', () => openProject(button.dataset.projectId)));
  }

  function openProject(projectId) {
    const project = readProjects().find(x => x.id === projectId);
    if (!project) return;
    window.safeStorageSet(ACTIVE_PROJECT_KEY, project.id);
    renderProjects();

    let drawer = document.querySelector('.stellar-project-drawer');
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'stellar-project-drawer';
      drawer.setAttribute('role','dialog');
      drawer.setAttribute('aria-modal','true');
      document.body.appendChild(drawer);
    }
    const chats = (project.chatIds || []).map(id => projectChat(project,id)).filter(Boolean);
    drawer.innerHTML = `
      <div class="stellar-project-card">
        <header><div><small>STELLAR PROJECT</small><h2>${esc(project.name)}</h2></div><button type="button" data-close-project aria-label="Close project">×</button></header>
        <p class="stellar-project-copy">Keep related chats together so a long build is easier to return to. Project grouping is stored in this browser and does not change your account or billing.</p>
        <div class="stellar-project-actions">
          <button type="button" data-add-current>＋ Add current chat</button>
          <button type="button" data-new-project-chat>＋ New chat</button>
        </div>
        <div class="stellar-project-chat-list">
          ${chats.length ? chats.map(chat => `
            <div class="stellar-project-chat">
              <button type="button" data-open-project-chat="${esc(chat.id)}"><strong>${esc(chat.name || 'Untitled chat')}</strong><small>${esc(chat.messages?.at?.(-1)?.content?.slice?.(0,70) || 'Open chat')}</small></button>
              <button type="button" data-remove-project-chat="${esc(chat.id)}" aria-label="Remove chat from project">×</button>
            </div>`).join('') : '<div class="stellar-project-nochats"><span>🪐</span><strong>No chats here yet</strong><small>Add the current chat or start a new one.</small></div>'}
        </div>
        <footer><button type="button" data-rename-project>Rename</button><button type="button" data-delete-project class="danger">Delete project</button></footer>
      </div>`;
    drawer.querySelector('[data-close-project]')?.addEventListener('click', () => drawer.remove());
    drawer.addEventListener('click', event => { if (event.target === drawer) drawer.remove(); }, { once:true });
    drawer.querySelector('[data-add-current]')?.addEventListener('click', () => addCurrentChatToProject(project.id));
    drawer.querySelector('[data-new-project-chat]')?.addEventListener('click', () => {
      try { window.newChat?.(); } catch {}
      setTimeout(() => addCurrentChatToProject(project.id), 30);
      drawer.remove();
    });
    drawer.querySelectorAll('[data-open-project-chat]').forEach(button => button.addEventListener('click', () => {
      try { window.loadChat?.(button.dataset.openProjectChat); } catch {}
      drawer.remove();
      if (window.innerWidth <= 767) { try { window.toggleSidebar?.(); } catch {} }
    }));
    drawer.querySelectorAll('[data-remove-project-chat]').forEach(button => button.addEventListener('click', () => removeChatFromProject(project.id, button.dataset.removeProjectChat)));
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
      <div class="stellar-usage-title"><small>STELLAR USAGE & LIMITS</small><h3>Your allowance at a glance</h3><p>Model power and request limits are shown separately from credit, so you always know whether you can keep building.</p></div>
      <div class="stellar-usage-grid">
        <div class="stellar-usage-stat"><small>PLAN</small><strong data-growth-plan>Free</strong><span>Current workspace access</span></div>
        <div class="stellar-usage-stat"><small>REQUESTS</small><strong data-growth-requests>—</strong><span data-growth-reset>Reset timing</span></div>
        <div class="stellar-usage-stat"><small>MODEL POWER</small><strong data-growth-usage-model>Star · Balanced</strong><span>Current selection</span></div>
      </div>
      <div class="stellar-usage-models" aria-label="Stellar power availability">
        ${LEVELS.map(level => `<span data-usage-tier="${level.key}"><b>${level.icon}</b><strong>${level.mode}</strong><small>${level.name}${level.pro ? ' · Pro' : ''}</small></span>`).join('')}
      </div>`;
    if (header) header.insertAdjacentElement('afterend', overview); else card.prepend(overview);
    syncUsageExperience();
  }

  function syncUsageExperience() {
    const plan = document.getElementById('u-plan')?.textContent?.trim() || 'Free';
    const requestText = document.getElementById('u-pct')?.textContent?.trim() || '—';
    const reset = document.getElementById('u-reset')?.textContent?.trim() || 'Reset timing unavailable';
    const level = levelFor();
    document.querySelectorAll('[data-growth-plan]').forEach(n => n.textContent = plan);
    document.querySelectorAll('[data-growth-requests]').forEach(n => n.textContent = requestText.replace(' requests left',''));
    document.querySelectorAll('[data-growth-reset]').forEach(n => n.textContent = reset);
    document.querySelectorAll('[data-growth-usage-model]').forEach(n => n.textContent = `${level.name} · ${level.mode}`);
    document.querySelectorAll('[data-usage-tier]').forEach(n => n.classList.toggle('is-current', n.dataset.usageTier === level.key));
  }

  function upgradeSidebarNewBuild() {
    const button = document.querySelector('#sidebar .side-new');
    if (!button) return;
    button.textContent = 'New Build';
    button.setAttribute('title','Start a new Stellar build chat');
  }

  function addGrowthSchema() {
    if (document.querySelector('script[data-stellar-growth-schema]')) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.stellarGrowthSchema = 'v1';
    script.textContent = JSON.stringify({
      '@context':'https://schema.org',
      '@type':'SoftwareApplication',
      name:'Stellar AI',
      url:'https://trystellarai.com/app',
      applicationCategory:'DeveloperApplication',
      operatingSystem:'Web',
      description:'AI Roblox Luau and FiveM development workspace with model power controls, project grouping, multi-file generation and iterative code fixes.'
    });
    document.head.appendChild(script);
  }

  function observe() {
    const menu = document.getElementById('model-menu');
    if (menu) new MutationObserver(() => syncReasoningControl()).observe(menu,{subtree:true,attributes:true,attributeFilter:['aria-checked']});
    const usage = document.getElementById('usage-modal');
    if (usage) new MutationObserver(() => { ensureUsageExperience(); syncUsageExperience(); }).observe(usage,{subtree:true,childList:true,characterData:true,attributes:true});
    const chats = document.getElementById('chats-list');
    if (chats) new MutationObserver(() => renderProjects()).observe(chats,{subtree:true,childList:true});
  }

  function init() {
    document.body.classList.add('stellar-growth-v1');
    buildReasoningControl();
    ensureProjectsRail();
    ensureUsageExperience();
    upgradeSidebarNewBuild();
    syncReasoningControl();
    syncUsageExperience();
    observe();
    addGrowthSchema();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
