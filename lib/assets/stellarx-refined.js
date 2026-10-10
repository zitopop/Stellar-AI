/* StellarX Refined: visual workspace enhancements without changing task permissions. */
(()=>{
  'use strict';
  const body=document.body, side=document.getElementById('sxWorkspaceSidebar');
  const composer=document.getElementById('taskComposer'), tabs=document.getElementById('sxModeTabs');
  const feed=document.getElementById('sxMessages'), prompt=document.getElementById('prompt');
  const actions=composer?.querySelector('.task-actions'), send=document.getElementById('planBtn');
  if(!side||!composer||!tabs||!feed||!prompt||!actions||!send)return;
  body.classList.add('sx-refined');
  const hero=document.querySelector('.work-hero');
  const title=document.getElementById('sxTopTitle');
  if(title)title.textContent='StellarX';
  // Keep PC status in normal document flow so it cannot cover the task composer.
  const statusBar=hero?.querySelector('.statusbox');
  if(statusBar)hero.after(statusBar);
  actions.insertBefore(tabs,send);
  const search=document.createElement('div');
  search.className='sx-search-wrap';
  const searchInput=document.createElement('input');
  searchInput.id='sxHistorySearch';searchInput.type='search';searchInput.placeholder='Search conversations';
  searchInput.setAttribute('aria-label','Search conversations');searchInput.autocomplete='off';
  search.append(searchInput);
  const historyLabel=side.querySelector('.sx-side-heading');
  side.insertBefore(search,historyLabel);
  const history=document.getElementById('sxSavedChats');
  function filterChats(){
    const query=searchInput.value.trim().toLowerCase();
    history?.querySelectorAll('.sx-chat-link').forEach(row=>{
      row.hidden=!!query&&!row.querySelector('.sx-open-chat')?.textContent?.toLowerCase().includes(query);
    });
  }
  searchInput.addEventListener('input',filterChats);
  if(history)new MutationObserver(filterChats).observe(history,{childList:true});
  const appearance=document.createElement('button');
  appearance.type='button';appearance.id='sxAppearance';
  appearance.className='sx-appearance';
  side.insertBefore(appearance,side.querySelector('.sx-side-foot'));
  let theme='dark';
  try{theme=localStorage.getItem('stellarx-appearance-v1')==='light'?'light':'dark'}catch{}
  function applyTheme(){
    body.dataset.sxTheme=theme;
    appearance.textContent=theme==='light'?'☾  Dark appearance':'☀  Light appearance';
    appearance.setAttribute('aria-pressed',theme==='light'?'true':'false');
    appearance.setAttribute('aria-label',theme==='light'?'Switch to dark theme':'Switch to light theme');
    // Inline important values override legacy global !important background styles.
    document.querySelectorAll('#sxPromptIdeas .sx-idea').forEach(card=>{
      if(theme==='light')card.style.setProperty('background','#fffcf8','important');
      else card.style.removeProperty('background');
    });
    if(hero){const heading=hero.querySelector('h1');if(heading){
      if(theme==='light'){
        heading.style.setProperty('color','#302b28','important');
        heading.style.setProperty('-webkit-text-fill-color','#302b28','important');
      }else{
        heading.style.removeProperty('color');heading.style.removeProperty('-webkit-text-fill-color');
      }
    }}
  }
  appearance.addEventListener('click',()=>{
    theme=theme==='light'?'dark':'light';
    try{localStorage.setItem('stellarx-appearance-v1',theme)}catch{}
    applyTheme();
  });
  applyTheme();
  const welcome=document.createElement('div');
  welcome.id='sxPromptIdeas';welcome.className='sx-prompt-ideas';
  welcome.setAttribute('aria-label','Things you can ask StellarX');
  const starters=[
    {icon:'✧',heading:'Create something',description:'Plan a new project',prompt:'Help me plan a new project from idea to launch.'},
    {icon:'⌘',heading:'Debug my code',description:'Find and explain a bug',prompt:'Help me debug my code. Ask me for the error and relevant snippet.'},
    {icon:'◈',heading:'Make a plan',description:'Break down a big goal',prompt:'Help me turn a big goal into clear practical steps.'},
    {icon:'▣',heading:'Use my PC',description:'Work in my project',mode:'computer'},
  ];
  starters.forEach(item=>{
    const btn=document.createElement('button');btn.className='sx-idea';btn.type='button';
    const icon=document.createElement('span');icon.className='sx-idea-icon';icon.textContent=item.icon;icon.setAttribute('aria-hidden','true');
    const words=document.createElement('span');words.className='sx-idea-words';
    const heading=document.createElement('strong');heading.textContent=item.heading;
    const info=document.createElement('small');info.textContent=item.description;
    words.append(heading,info);btn.append(icon,words);
    btn.addEventListener('click',()=>{
      if(item.mode==='computer'){
        document.querySelector('[data-sx-mode="computer"]')?.click();
      }else{
        document.querySelector('[data-sx-mode="chat"]')?.click();
        prompt.value=item.prompt;
        prompt.dispatchEvent(new Event('input',{bubbles:true}));
      }
      prompt.focus();
    });
    welcome.append(btn);
  });
  if(hero)hero.after(welcome);
  applyTheme();
  const menu=document.getElementById('sxSidebarToggle');
  if(menu){
    menu.addEventListener('click',()=>{
      if(window.matchMedia('(min-width:851px)').matches){
        const collapsed=body.classList.toggle('sx-side-collapsed');
        menu.setAttribute('aria-expanded',String(!collapsed));
        menu.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');
      }
    });
    menu.setAttribute('aria-label','Toggle sidebar');
  }
  if(history)history.addEventListener('click',event=>{
    if(event.target.closest('.sx-open-chat')){
      searchInput.value='';filterChats();
    }
  },{capture:true});
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();
      if(window.matchMedia('(max-width:850px)').matches&&!body.classList.contains('sx-menu-open'))menu?.click();
      if(window.matchMedia('(min-width:851px)').matches&&body.classList.contains('sx-side-collapsed'))menu?.click();
      searchInput.focus();searchInput.select();
    }
    const input=event.target.closest('input,textarea,[contenteditable="true"]');
    if(!input&&event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      event.preventDefault();prompt.focus();
    }
  });
  // The approval-based desktop workflow remains the sole path to computer actions.
})();
