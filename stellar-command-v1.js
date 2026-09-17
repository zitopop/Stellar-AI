(() => {
  'use strict';
  if (!/^\/app(?:\.html)?\/?$/.test(location.pathname)) return;

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
      ['roblox','Roblox','Luau, Studio & game systems'],['web','Website','Frontend, backend & deployment']
    ];

    let mode = safeStorageGet('stellar_workspace_mode') || 'chat';
    if (!modes[mode]) mode = 'chat';
    let project = safeStorageGet('stellar_workspace_project') || 'general';
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

    const projectBtn = document.createElement('button');
    projectBtn.type='button'; projectBtn.className='stellar-project-btn';
    projectBtn.setAttribute('aria-haspopup','dialog');
    dock.appendChild(projectBtn);
    composer.insertBefore(dock, composer.firstChild);

    const banner = document.createElement('div');
    banner.className='stellar-workspace-banner';
    banner.innerHTML='<span>Workspace</span><strong class="stellar-banner-project"></strong><span>•</span><strong class="stellar-banner-mode"></strong><span class="spacer"></span><span class="stellar-trust-pill">Review before deploy</span>';
    composer.parentElement?.insertBefore(banner, composer);

    function projectMeta(){ return projects.find(([id])=>id===project) || projects[0]; }
    function render(){
      dock.querySelectorAll('.stellar-mode-btn').forEach(b=>b.classList.toggle('is-active',b.dataset.mode===mode));
      const [,label] = projectMeta();
      projectBtn.innerHTML=`<span class="stellar-project-dot"></span><span>${label}</span><span aria-hidden="true">⌄</span>`;
      banner.querySelector('.stellar-banner-project').textContent=label;
      banner.querySelector('.stellar-banner-mode').textContent=modes[mode].label+' mode';
      input.placeholder=modes[mode].placeholder;
    }
    function setMode(next){ mode=next; safeStorageSet('stellar_workspace_mode',mode); render(); input.focus(); }

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
        b.addEventListener('click',()=>{project=id;safeStorageSet('stellar_workspace_project',project);render();closePopover();input.focus();});
        grid.appendChild(b);
      });
      popover.appendChild(grid); document.body.appendChild(popover);
      const r=projectBtn.getBoundingClientRect();
      popover.style.top=`${Math.min(innerHeight-popover.offsetHeight-12,r.bottom+8)}px`;
      popover.style.left=`${Math.min(innerWidth-popover.offsetWidth-12,Math.max(12,r.right-popover.offsetWidth))}px`;
      projectBtn.setAttribute('aria-expanded','true');
    }
    projectBtn.addEventListener('click',(e)=>{e.stopPropagation();popover?closePopover():openPopover();});
    document.addEventListener('click',(e)=>{if(popover&&!popover.contains(e.target)&&e.target!==projectBtn)closePopover();});
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
