(() => {
  'use strict';
  if (window.__stellarWorkspaceV1) return;
  window.__stellarWorkspaceV1 = true;

  const LOCAL_KEY = 'stellar:workspace:v1';
  const MODE_KEY = 'stellar:workspace:mode';
  const allowedModes = new Set(['chat', 'search', 'research']);
  const state = {
    mode: allowedModes.has(localStorage.getItem(MODE_KEY)) ? localStorage.getItem(MODE_KEY) : 'chat',
    workspace: { version: 1, projects: [], memories: [], preferences: { mode: 'chat', memoryEnabled: true, showSources: true } },
    loadedEmail: '',
    saving: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const nowId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const currentEmail = () => {
    try { return String(window.Store?.get?.()?.user?.email || '').trim().toLowerCase(); } catch { return ''; }
  };
  const currentId = () => {
    try { return typeof currentChatId !== 'undefined' ? currentChatId : (window.currentChatId || null); } catch { return null; }
  };
  const getHeaders = (json = true) => {
    try { if (typeof apiHeaders === 'function') return apiHeaders(json); } catch {}
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    try {
      const token = window.Store?.get?.()?.session;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {}
    return headers;
  };

  function normalizeWorkspace(value) {
    const source = value && typeof value === 'object' ? value : {};
    const mode = allowedModes.has(source.preferences?.mode) ? source.preferences.mode : state.mode;
    return {
      version: 1,
      projects: Array.isArray(source.projects) ? source.projects.slice(0, 24) : [],
      memories: Array.isArray(source.memories) ? source.memories.slice(0, 30) : [],
      preferences: {
        mode,
        memoryEnabled: source.preferences?.memoryEnabled !== false,
        showSources: source.preferences?.showSources !== false,
      },
    };
  }

  function loadLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
      if (parsed) state.workspace = normalizeWorkspace(parsed);
    } catch {}
    if (allowedModes.has(state.workspace.preferences.mode)) state.mode = state.workspace.preferences.mode;
    syncModeUi();
  }

  function saveLocal() {
    state.workspace.preferences.mode = state.mode;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state.workspace));
      localStorage.setItem(MODE_KEY, state.mode);
    } catch {}
  }

  async function loadRemote(force = false) {
    const email = currentEmail();
    if (!email) return false;
    if (!force && state.loadedEmail === email) return true;
    try {
      const response = await fetch('/api/workspace', { headers: getHeaders(false) });
      if (!response.ok) return false;
      const data = await response.json();
      state.workspace = normalizeWorkspace(data.workspace);
      state.loadedEmail = email;
      if (allowedModes.has(state.workspace.preferences.mode)) state.mode = state.workspace.preferences.mode;
      saveLocal();
      syncModeUi();
      return true;
    } catch { return false; }
  }

  async function saveWorkspace() {
    saveLocal();
    const email = currentEmail();
    if (!email || state.saving) return;
    state.saving = true;
    try {
      await fetch('/api/workspace', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ workspace: state.workspace }),
      });
      state.loadedEmail = email;
    } catch {}
    finally { state.saving = false; }
  }

  const modeMeta = {
    chat: { icon: '✦', label: 'Chat', detail: 'Fast conversation' },
    search: { icon: '⌕', label: 'Search', detail: 'Search the web' },
    research: { icon: '◉', label: 'Research', detail: 'More sources + deeper context' },
  };

  function setMode(mode) {
    if (!allowedModes.has(mode)) return;
    state.mode = mode;
    state.workspace.preferences.mode = mode;
    syncModeUi();
    saveWorkspace();
    closePlusMenu();
    const textarea = $('#txt');
    if (textarea) {
      textarea.placeholder = mode === 'research'
        ? 'Ask Stellar to research anything…'
        : mode === 'search' ? 'Search the web with Stellar…' : 'Message Stellar AI…';
      textarea.focus({ preventScroll: true });
    }
  }

  function syncModeUi() {
    const meta = modeMeta[state.mode] || modeMeta.chat;
    const button = $('#stellar-mode-btn');
    if (button) {
      button.innerHTML = `<span aria-hidden="true">${meta.icon}</span><span>${meta.label}</span><span class="stellar-mode-chevron" aria-hidden="true">⌄</span>`;
      button.setAttribute('aria-label', `${meta.label} mode. ${meta.detail}`);
      button.dataset.mode = state.mode;
    }
    $$('[data-stellar-mode]').forEach((node) => node.setAttribute('aria-checked', String(node.dataset.stellarMode === state.mode)));
  }

  function activeProject() {
    const chatId = currentId();
    if (!chatId) return null;
    return state.workspace.projects.find((project) => Array.isArray(project.chatIds) && project.chatIds.includes(chatId)) || null;
  }

  function persistentMemoryText() {
    if (state.workspace.preferences.memoryEnabled === false) return '';
    const notes = state.workspace.memories.map((memory) => String(memory.text || '').trim()).filter(Boolean);
    const project = activeProject();
    const sections = [];
    if (notes.length) sections.push(`Account memory:\n${notes.map((note) => `- ${note}`).join('\n')}`);
    if (project?.instructions) sections.push(`Active project: ${project.name}\nProject instructions:\n${project.instructions}`);
    return sections.join('\n\n').slice(0, 6000);
  }

  function patchMemory() {
    const original = typeof window.buildCrossChatMemory === 'function' ? window.buildCrossChatMemory : null;
    if (!original || original.__stellarWorkspaceWrapped) return;
    const wrapped = function(activeChatId, maxChars = 18000) {
      let base = '';
      try { base = original(activeChatId, maxChars) || ''; } catch {}
      const persistent = persistentMemoryText();
      return [persistent, base].filter(Boolean).join('\n\n').slice(0, maxChars);
    };
    wrapped.__stellarWorkspaceWrapped = true;
    window.buildCrossChatMemory = wrapped;
  }

  function patchSearchModes() {
    const originalNeedsSearch = typeof window.needsSearch === 'function' ? window.needsSearch : null;
    if (originalNeedsSearch && !originalNeedsSearch.__stellarWorkspaceWrapped) {
      const wrappedNeedsSearch = function(text) {
        if (state.mode === 'search' || state.mode === 'research') return true;
        return originalNeedsSearch(text);
      };
      wrappedNeedsSearch.__stellarWorkspaceWrapped = true;
      window.needsSearch = wrappedNeedsSearch;
    }

    const originalRun = typeof window.runWebSearch === 'function' ? window.runWebSearch : null;
    if (originalRun && !originalRun.__stellarWorkspaceWrapped) {
      const wrappedRun = async function(query) {
        if (state.mode !== 'research') return originalRun(query);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch('/api/search', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, mode: 'research' }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !Array.isArray(data.results) || !data.results.length) return originalRun(query);
          return data.results.slice(0, 16).map((item, index) => {
            const extra = Array.isArray(item.extra) && item.extra.length ? `\n${item.extra.join('\n')}` : '';
            return `[${index + 1}] ${item.title || ''}\n${item.desc || ''}${extra}\n${item.url || ''}`;
          }).join('\n\n').slice(0, 18000);
        } catch { return originalRun(query); }
        finally { clearTimeout(timeout); }
      };
      wrappedRun.__stellarWorkspaceWrapped = true;
      window.runWebSearch = wrappedRun;
    }
  }

  function closePlusMenu() {
    const menu = $('#stellar-plus-menu');
    const button = $('#stellar-plus-btn');
    if (menu) menu.hidden = true;
    button?.setAttribute('aria-expanded', 'false');
  }

  function openPlusMenu() {
    const menu = $('#stellar-plus-menu');
    const button = $('#stellar-plus-btn');
    if (!menu) return;
    menu.hidden = false;
    button?.setAttribute('aria-expanded', 'true');
    menu.querySelector('button')?.focus({ preventScroll: true });
  }

  function triggerExisting(selector, fallback) {
    const node = $(selector);
    if (node) return node.click();
    try { if (typeof fallback === 'function') fallback(); } catch {}
  }

  function ensureComposerTools() {
    if ($('#stellar-plus-btn')) return;
    const foot = $('.composer-foot') || $('.input-area .flex');
    if (!foot) return;

    const wrap = document.createElement('div');
    wrap.className = 'stellar-workspace-composer-tools';
    wrap.innerHTML = `
      <button type="button" id="stellar-plus-btn" class="stellar-plus-btn" aria-label="Add files and tools" aria-haspopup="menu" aria-controls="stellar-plus-menu" aria-expanded="false">＋</button>
      <button type="button" id="stellar-mode-btn" class="stellar-mode-btn" aria-haspopup="menu" aria-controls="stellar-plus-menu"></button>
      <div id="stellar-plus-menu" class="stellar-plus-menu" role="menu" hidden>
        <div class="stellar-menu-label">Add to chat</div>
        <button type="button" role="menuitem" data-tool="image"><span>▧</span><b>Photo / image</b><small>Attach an image</small></button>
        <button type="button" role="menuitem" data-tool="files"><span>◫</span><b>Project files</b><small>Open generated files</small></button>
        <div class="stellar-menu-label">Mode</div>
        ${Object.entries(modeMeta).map(([key, meta]) => `<button type="button" role="menuitemradio" data-stellar-mode="${key}" aria-checked="false"><span>${meta.icon}</span><b>${meta.label}</b><small>${meta.detail}</small></button>`).join('')}
        <div class="stellar-menu-label">Workspace</div>
        <button type="button" role="menuitem" data-tool="projects"><span>◇</span><b>Projects</b><small>Group chats and instructions</small></button>
        <button type="button" role="menuitem" data-tool="memory"><span>◎</span><b>Memory</b><small>What Stellar should remember</small></button>
        <button type="button" role="menuitem" data-tool="voice"><span>⌁</span><b>Voice</b><small>Talk instead of typing</small></button>
      </div>`;
    foot.prepend(wrap);

    $('#stellar-plus-btn', wrap)?.addEventListener('click', (event) => {
      event.stopPropagation();
      const menu = $('#stellar-plus-menu');
      if (menu?.hidden) openPlusMenu(); else closePlusMenu();
    });
    $('#stellar-mode-btn', wrap)?.addEventListener('click', (event) => { event.stopPropagation(); openPlusMenu(); });
    $$('[data-stellar-mode]', wrap).forEach((button) => button.addEventListener('click', () => setMode(button.dataset.stellarMode)));
    $$('[data-tool]', wrap).forEach((button) => button.addEventListener('click', () => {
      const tool = button.dataset.tool;
      closePlusMenu();
      if (tool === 'image') triggerExisting('#image-upload-btn');
      if (tool === 'files') triggerExisting('#ws-btn', window.toggleWorkspace);
      if (tool === 'projects') openWorkspace('projects');
      if (tool === 'memory') openWorkspace('memory');
      if (tool === 'voice') triggerExisting('#mic-btn');
    }));
    syncModeUi();
  }

  function ensureSidebarTools() {
    if ($('#stellar-workspace-nav')) return;
    const search = $('#search');
    if (!search) return;
    const nav = document.createElement('div');
    nav.id = 'stellar-workspace-nav';
    nav.className = 'stellar-workspace-nav';
    nav.innerHTML = `
      <button type="button" data-open-workspace="projects"><span>◇</span>Projects</button>
      <button type="button" data-open-workspace="memory"><span>◎</span>Memory</button>
      <button type="button" data-open-workspace="tools"><span>✦</span>Tools</button>`;
    const anchor = search.parentElement || search;
    anchor.insertAdjacentElement('afterend', nav);
    $$('[data-open-workspace]', nav).forEach((button) => button.addEventListener('click', () => openWorkspace(button.dataset.openWorkspace)));
  }

  function ensureWorkspaceModal() {
    if ($('#stellar-workspace-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'stellar-workspace-modal';
    modal.className = 'stellar-workspace-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="stellar-workspace-card" role="dialog" aria-modal="true" aria-labelledby="stellar-workspace-title">
        <header><div><small>STELLAR WORKSPACE</small><h2 id="stellar-workspace-title">Projects</h2></div><button type="button" id="stellar-workspace-close" aria-label="Close workspace">×</button></header>
        <nav aria-label="Workspace sections">
          <button type="button" data-workspace-tab="projects">Projects</button>
          <button type="button" data-workspace-tab="memory">Memory</button>
          <button type="button" data-workspace-tab="tools">Tools</button>
        </nav>
        <section id="stellar-workspace-panel"></section>
      </div>`;
    document.body.appendChild(modal);
    $('#stellar-workspace-close', modal)?.addEventListener('click', closeWorkspace);
    modal.addEventListener('pointerdown', (event) => { if (event.target === modal) closeWorkspace(); });
    $$('[data-workspace-tab]', modal).forEach((button) => button.addEventListener('click', () => renderWorkspacePanel(button.dataset.workspaceTab)));
  }

  async function openWorkspace(tab = 'projects') {
    ensureWorkspaceModal();
    await loadRemote();
    const modal = $('#stellar-workspace-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('stellar-workspace-open');
    renderWorkspacePanel(tab);
    $('#stellar-workspace-close')?.focus({ preventScroll: true });
  }

  function closeWorkspace() {
    const modal = $('#stellar-workspace-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('stellar-workspace-open');
  }

  function renderWorkspacePanel(tab) {
    const panel = $('#stellar-workspace-panel');
    if (!panel) return;
    const title = $('#stellar-workspace-title');
    if (title) title.textContent = tab === 'memory' ? 'Memory' : tab === 'tools' ? 'Tools' : 'Projects';
    $$('[data-workspace-tab]').forEach((button) => button.classList.toggle('active', button.dataset.workspaceTab === tab));
    if (tab === 'memory') renderMemory(panel);
    else if (tab === 'tools') renderTools(panel);
    else renderProjects(panel);
  }

  function renderProjects(panel) {
    const chatId = currentId();
    panel.innerHTML = `
      <div class="stellar-workspace-intro"><h3>Keep long builds together</h3><p>Projects group chats and project-specific instructions. Signed-in projects sync to your account.</p></div>
      <form id="stellar-project-form" class="stellar-project-form"><input id="stellar-project-name" maxlength="80" placeholder="New project name" required><button type="submit">Create project</button></form>
      <div class="stellar-project-list">${state.workspace.projects.length ? state.workspace.projects.map((project) => {
        const attached = chatId && Array.isArray(project.chatIds) && project.chatIds.includes(chatId);
        return `<article class="stellar-project-card" data-project-id="${escapeHtml(project.id)}"><div class="stellar-project-head"><div><strong>${escapeHtml(project.name)}</strong><small>${project.chatIds?.length || 0} chat${project.chatIds?.length === 1 ? '' : 's'}</small></div><button type="button" data-project-delete aria-label="Delete ${escapeHtml(project.name)}">×</button></div><textarea data-project-instructions maxlength="2400" placeholder="Project instructions for Stellar…">${escapeHtml(project.instructions || '')}</textarea><div class="stellar-project-actions"><button type="button" data-project-save>Save instructions</button><button type="button" data-project-attach ${chatId ? '' : 'disabled'}>${attached ? 'Remove current chat' : 'Add current chat'}</button></div></article>`;
      }).join('') : '<div class="stellar-empty-state">No projects yet. Create one for a server, game, business or long build.</div>'}</div>`;

    $('#stellar-project-form', panel)?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const input = $('#stellar-project-name', panel);
      const name = String(input?.value || '').trim().slice(0, 80);
      if (!name) return;
      state.workspace.projects.unshift({ id: nowId('project'), name, description: '', instructions: '', chatIds: [], createdAt: Date.now(), updatedAt: Date.now() });
      await saveWorkspace();
      renderProjects(panel);
    });

    $$('.stellar-project-card', panel).forEach((card) => {
      const project = state.workspace.projects.find((item) => item.id === card.dataset.projectId);
      if (!project) return;
      $('[data-project-save]', card)?.addEventListener('click', async () => {
        project.instructions = String($('[data-project-instructions]', card)?.value || '').trim().slice(0, 2400);
        project.updatedAt = Date.now();
        await saveWorkspace();
      });
      $('[data-project-attach]', card)?.addEventListener('click', async () => {
        const id = currentId();
        if (!id) return;
        project.chatIds = Array.isArray(project.chatIds) ? project.chatIds : [];
        project.chatIds = project.chatIds.includes(id) ? project.chatIds.filter((chatId) => chatId !== id) : [...project.chatIds, id].slice(-60);
        project.updatedAt = Date.now();
        await saveWorkspace();
        renderProjects(panel);
      });
      $('[data-project-delete]', card)?.addEventListener('click', async () => {
        state.workspace.projects = state.workspace.projects.filter((item) => item.id !== project.id);
        await saveWorkspace();
        renderProjects(panel);
      });
    });
  }

  function renderMemory(panel) {
    const enabled = state.workspace.preferences.memoryEnabled !== false;
    panel.innerHTML = `
      <div class="stellar-workspace-intro"><h3>Memory you control</h3><p>Add facts or preferences Stellar should carry into future chats. You can switch this off or remove individual items at any time.</p></div>
      <label class="stellar-memory-toggle"><input type="checkbox" id="stellar-memory-enabled" ${enabled ? 'checked' : ''}><span><strong>Use memory in chats</strong><small>${enabled ? 'Enabled' : 'Disabled'}</small></span></label>
      <form id="stellar-memory-form" class="stellar-memory-form"><textarea id="stellar-memory-text" maxlength="700" placeholder="Example: Prefer standalone FiveM code instead of QBCore."></textarea><button type="submit">Remember</button></form>
      <div class="stellar-memory-list">${state.workspace.memories.length ? state.workspace.memories.map((memory) => `<div class="stellar-memory-item" data-memory-id="${escapeHtml(memory.id)}"><span>✦</span><p>${escapeHtml(memory.text)}</p><button type="button" data-memory-delete aria-label="Remove memory">×</button></div>`).join('') : '<div class="stellar-empty-state">Nothing saved yet.</div>'}</div>`;

    $('#stellar-memory-enabled', panel)?.addEventListener('change', async (event) => {
      state.workspace.preferences.memoryEnabled = event.target.checked;
      await saveWorkspace();
      renderMemory(panel);
    });
    $('#stellar-memory-form', panel)?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const textarea = $('#stellar-memory-text', panel);
      const text = String(textarea?.value || '').trim().slice(0, 700);
      if (!text) return;
      state.workspace.memories.unshift({ id: nowId('memory'), text, createdAt: Date.now() });
      state.workspace.memories = state.workspace.memories.slice(0, 30);
      await saveWorkspace();
      renderMemory(panel);
    });
    $$('[data-memory-delete]', panel).forEach((button) => button.addEventListener('click', async () => {
      const id = button.closest('[data-memory-id]')?.dataset.memoryId;
      state.workspace.memories = state.workspace.memories.filter((memory) => memory.id !== id);
      await saveWorkspace();
      renderMemory(panel);
    }));
  }

  function renderTools(panel) {
    panel.innerHTML = `
      <div class="stellar-workspace-intro"><h3>Tools inside the conversation</h3><p>Use real Stellar features from one place. Tools marked “ready” are already wired to the current app.</p></div>
      <div class="stellar-tools-grid">
        <button type="button" data-ready-tool="search"><span>⌕</span><strong>Web Search</strong><small>Ready · current web results</small></button>
        <button type="button" data-ready-tool="research"><span>◉</span><strong>Research</strong><small>Ready · larger source set</small></button>
        <button type="button" data-ready-tool="files"><span>◫</span><strong>Project Files</strong><small>Ready · generated workspace</small></button>
        <button type="button" data-ready-tool="voice"><span>⌁</span><strong>Voice</strong><small>Ready · talk to Stellar</small></button>
        <div class="stellar-tool-card pending"><span>◆</span><strong>Connected apps</strong><small>Next layer · Drive, Gmail, GitHub and more require user-authorized connections.</small></div>
        <div class="stellar-tool-card pending"><span>↗</span><strong>Work / Agent mode</strong><small>Next layer · multi-step tool execution with approvals and progress.</small></div>
      </div>`;
    $$('[data-ready-tool]', panel).forEach((button) => button.addEventListener('click', () => {
      const tool = button.dataset.readyTool;
      if (tool === 'search' || tool === 'research') { setMode(tool); closeWorkspace(); }
      if (tool === 'files') { closeWorkspace(); triggerExisting('#ws-btn', window.toggleWorkspace); }
      if (tool === 'voice') { closeWorkspace(); triggerExisting('#mic-btn'); }
    }));
  }

  function bindGlobalEvents() {
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.stellar-workspace-composer-tools')) closePlusMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { closePlusMenu(); if (!$('#stellar-workspace-modal')?.hidden) closeWorkspace(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); $('#search')?.focus({ preventScroll: true });
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault(); openWorkspace('projects');
      }
    });
  }

  function init() {
    loadLocal();
    ensureComposerTools();
    ensureSidebarTools();
    ensureWorkspaceModal();
    patchMemory();
    patchSearchModes();
    bindGlobalEvents();
    loadRemote().catch(() => {});
    setTimeout(() => loadRemote().catch(() => {}), 1400);
  }

  window.StellarWorkspace = { open: openWorkspace, close: closeWorkspace, setMode, state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
