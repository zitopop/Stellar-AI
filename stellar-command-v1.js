(() => {
  'use strict';
  if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;

  const WORKSPACE_MARKER = '[Stellar Workspace Context]';
  const safeGet = (key, fallback) => {
    try {
      if (typeof window.safeStorageGet === 'function') return window.safeStorageGet(key) || fallback;
      return window.localStorage.getItem(key) || fallback;
    } catch (_) { return fallback; }
  };

  function workspaceContext() {
    const mode = safeGet('stellar_workspace_mode', 'chat');
    const project = safeGet('stellar_workspace_project', 'general');
    const projectRules = {
      general: 'Use the user’s stated stack and constraints. Do not invent missing project facts.',
      fivem: 'Treat this as a FiveM project. Keep client/server responsibilities clear, validate security-sensitive actions server-side, label resource/file paths, and do not assume QBCore, ESX, ox_lib, or another framework unless the user specifies it.',
      roblox: 'Treat this as a Roblox project. Use Luau conventions, keep client/server responsibilities clear, validate RemoteEvent/RemoteFunction input on the server, and label script placement in Studio.',
      web: 'Treat this as a web project. Keep frontend/backend boundaries clear, preserve responsive and accessible behavior, call out environment variables, and include deployment/verification steps when relevant.',
      discord: 'Treat this as a Discord bot project. Separate bot commands, events, configuration and persistence cleanly; validate permissions and user input; keep tokens and secrets in environment variables; and label exact file paths and required bot intents.'
    };
    const modeRules = {
      chat: 'Answer normally and directly. Use project context when it materially improves the answer.',
      build: 'Act in build mode. Produce implementation-ready output, including a concise plan, complete relevant files or patches with destination paths, dependencies/configuration, and verification steps. Prefer runnable output over vague advice. Never claim something was deployed or tested unless it actually was.',
      fix: 'Act in fix mode. Identify the likely root cause from available evidence, make the smallest safe change that resolves it, preserve unrelated behavior, show exact affected files/patches, and give a short verification checklist. State uncertainty instead of inventing a diagnosis.',
      deploy: 'Act in deploy mode. Give a safe preflight, exact deployment/install steps, required environment/configuration items, verification checks, and a rollback path. Do not expose secrets or recommend destructive changes without warning.'
    };
    return `${WORKSPACE_MARKER}\nProject: ${project}\nMode: ${mode}\n${projectRules[project] || projectRules.general}\n${modeRules[mode] || modeRules.chat}\nAI-generated code and deployment instructions should be reviewed and tested before production use.`;
  }

  function enhanceChatPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const context = workspaceContext();
    payload.workspace_mode = safeGet('stellar_workspace_mode', 'chat');
    payload.workspace_project = safeGet('stellar_workspace_project', 'general');

    if (typeof payload.system_prompt === 'string') {
      if (!payload.system_prompt.includes(WORKSPACE_MARKER)) payload.system_prompt = `${payload.system_prompt}\n\n${context}`;
      return payload;
    }

    if (Array.isArray(payload.messages)) {
      const system = payload.messages.find((m) => m && m.role === 'system' && typeof m.content === 'string');
      if (system) {
        if (!system.content.includes(WORKSPACE_MARKER)) system.content = `${system.content}\n\n${context}`;
      } else {
        payload.messages = [{ role:'system', content:context }, ...payload.messages];
      }
    }
    return payload;
  }

  // Keep the core app untouched: only enrich Stellar's own chat endpoints at send time.
  if (!window.__stellarWorkspaceFetchWrapped && typeof window.fetch === 'function') {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      try {
        const rawUrl = typeof input === 'string' ? input : input?.url;
        const url = new URL(rawUrl || '', location.href);
        const isChatEndpoint = url.origin === location.origin && (url.pathname === '/api/ai' || url.pathname === '/api/chat');
        if (isChatEndpoint && init && typeof init.body === 'string') {
          const payload = JSON.parse(init.body);
          const isChatPayload = payload?.action === 'chat' || (payload?.action == null && Array.isArray(payload?.messages));
          if (isChatPayload) init = { ...init, body: JSON.stringify(enhanceChatPayload(payload)) };
        }
      } catch (_) {
        // Fail open: never block a normal Stellar request because workspace enrichment failed.
      }
      return nativeFetch(input, init);
    };
    window.__stellarWorkspaceFetchWrapped = true;
  }

  const onReady = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once:true }) : fn();
  onReady(() => {
    document.documentElement.classList.add('stellar-command-v1');
    const composer = document.querySelector('.input-area');
    const input = document.querySelector('#txt');
    if (!composer || !input || document.querySelector('.stellar-command-dock')) return;

    const modes = {
      chat:{label:'Chat',icon:'✦',placeholder:'Ask Stellar anything…'},
      build:{label:'Build',icon:'⌘',placeholder:'Describe the complete project or feature you want Stellar to build…'},
      fix:{label:'Fix',icon:'◇',placeholder:'Paste the error or describe what is broken…'},
      deploy:{label:'Deploy',icon:'↗',placeholder:'What do you want to publish, install or deploy?'}
    };
    const projects = [
      ['general','General','Any task or idea'],['fivem','FiveM','Lua, resources & server systems'],
      ['roblox','Roblox','Luau, Studio & game systems'],['web','Website','Frontend, backend & deployment'],
      ['discord','Discord Bot','Commands, events & integrations']
    ];

    let mode = safeGet('stellar_workspace_mode', 'chat');
    if (!modes[mode]) mode = 'chat';
    let project = safeGet('stellar_workspace_project', 'general');
    if (!projects.some(([id]) => id === project)) project = 'general';

    const dock = document.createElement('div');
    dock.className = 'stellar-command-dock';
    dock.setAttribute('role','toolbar');
    dock.setAttribute('aria-label','Stellar workspace mode');

    Object.entries(modes).forEach(([id,meta]) => {
      const b = document.createElement('button');
      b.type='button'; b.className='stellar-mode-btn'; b.dataset.mode=id;
      b.innerHTML=`<span aria-hidden="true">${meta.icon}</span><span>${meta.label}</span>`;
      b.addEventListener('click',()=>setMode(id));
      dock.appendChild(b);
    });

    const voiceBtn = document.createElement('a');
    voiceBtn.className='stellar-voice-btn';
    voiceBtn.href='/jarvis';
    voiceBtn.setAttribute('aria-label','Open Stellar Jarvis voice and vision workspace');
    voiceBtn.innerHTML='<span aria-hidden="true">◉</span><span>Voice</span>';
    dock.appendChild(voiceBtn);

    const projectBtn = document.createElement('button');
    projectBtn.type='button'; projectBtn.className='stellar-project-btn';
    projectBtn.setAttribute('aria-haspopup','dialog');
    projectBtn.setAttribute('aria-expanded','false');
    dock.appendChild(projectBtn);
    composer.insertBefore(dock, composer.firstChild);

    const banner = document.createElement('div');
    banner.className='stellar-workspace-banner';
    banner.innerHTML='<span>Workspace</span><strong class="stellar-banner-project"></strong><span>•</span><strong class="stellar-banner-mode"></strong><span class="spacer"></span><span class="stellar-trust-pill">Review before deploy</span>';
    composer.parentElement?.insertBefore(banner, composer);

    function projectMeta(){ return projects.find(([id])=>id===project) || projects[0]; }
    function render(){
      dock.querySelectorAll('.stellar-mode-btn').forEach(b=>{
        const active=b.dataset.mode===mode;
        b.classList.toggle('is-active',active);
        b.setAttribute('aria-pressed',String(active));
      });
      const [,label] = projectMeta();
      projectBtn.innerHTML=`<span class="stellar-project-dot"></span><span>${label}</span><span aria-hidden="true">⌄</span>`;
      banner.querySelector('.stellar-banner-project').textContent=label;
      banner.querySelector('.stellar-banner-mode').textContent=modes[mode].label+' mode';
      input.placeholder=modes[mode].placeholder;
    }
    function setMode(next){
      mode=next;
      if (typeof window.safeStorageSet === 'function') window.safeStorageSet('stellar_workspace_mode',mode); else try{localStorage.setItem('stellar_workspace_mode',mode);}catch(_){}
      render(); input.focus();
    }

    let popover=null;
    function closePopover(){ popover?.remove(); popover=null; projectBtn.setAttribute('aria-expanded','false'); }
    function openPopover(){
      closePopover();
      popover=document.createElement('div'); popover.className='stellar-command-popover'; popover.setAttribute('role','dialog'); popover.setAttribute('aria-label','Choose project type');
      const heading=document.createElement('h3'); heading.textContent='Project context'; popover.appendChild(heading);
      const grid=document.createElement('div'); grid.className='stellar-project-grid';
      projects.forEach(([id,label,desc])=>{
        const b=document.createElement('button'); b.type='button'; b.className='stellar-project-option'+(id===project?' is-active':'');
        b.innerHTML=`<strong>${label}</strong><br><span>${desc}</span>`;
        b.addEventListener('click',()=>{
          project=id;
          if (typeof window.safeStorageSet === 'function') window.safeStorageSet('stellar_workspace_project',project); else try{localStorage.setItem('stellar_workspace_project',project);}catch(_){}
          render(); closePopover(); input.focus();
        });
        grid.appendChild(b);
      });
      popover.appendChild(grid); document.body.appendChild(popover);
      const r=projectBtn.getBoundingClientRect();
      popover.style.top=`${Math.min(innerHeight-popover.offsetHeight-12,r.bottom+8)}px`;
      popover.style.left=`${Math.min(innerWidth-popover.offsetWidth-12,Math.max(12,r.right-popover.offsetWidth))}px`;
      projectBtn.setAttribute('aria-expanded','true');
    }
    projectBtn.addEventListener('click',(e)=>{e.stopPropagation();popover?closePopover():openPopover();});
    document.addEventListener('click',(e)=>{if(popover&&!popover.contains(e.target)&&!projectBtn.contains(e.target))closePopover();});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closePopover();});

    const originalNewChat = window.newChat;
    if (typeof originalNewChat === 'function' && !originalNewChat.__stellarWrapped) {
      const wrapped = function(){ const result=originalNewChat.apply(this,arguments); setTimeout(()=>input?.focus(),40); return result; };
      wrapped.__stellarWrapped=true; window.newChat=wrapped;
    }

    const query = new URLSearchParams(location.search).get('prompt');
    if(query && !input.value){ input.value=query; input.dispatchEvent(new Event('input',{bubbles:true})); }
    render();
  });
})();
