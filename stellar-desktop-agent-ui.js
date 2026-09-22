(()=> {
  const BUTTON_ID='stellar-pc-agent-button';
  function sessionToken(){
    try{return String(JSON.parse(localStorage.getItem('stellar-store')||'{}')?.session||'')}catch{return ''}
  }
  async function isOwner(){
    const token=sessionToken(); if(!token)return false;
    try{
      const r=await fetch('/api/get-plan',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      return r.ok&&d?.owner===true;
    }catch{return false}
  }
  function mount(){
    if(document.getElementById(BUTTON_ID))return;
    const host=document.querySelector('.sidebar-footer,.sidebar__footer,[data-sidebar-footer],aside .bottom,aside nav,.sidebar')||document.body;
    const a=document.createElement('a');
    a.id=BUTTON_ID;
    a.href='/desktop';
    a.title='PC Agent — control your paired Windows workspace';
    a.setAttribute('aria-label','Open PC Agent');
    a.innerHTML='<span aria-hidden="true" style="font-size:16px">⌘</span><span class="stellar-pc-label">PC Agent</span>';
    a.style.cssText='display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 12px;margin:8px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.045);color:inherit;text-decoration:none;font:700 12px/1 system-ui,sans-serif;cursor:pointer;touch-action:manipulation';
    a.addEventListener('mouseenter',()=>a.style.background='rgba(255,255,255,.08)');
    a.addEventListener('mouseleave',()=>a.style.background='rgba(255,255,255,.045)');
    if(host===document.body){
      a.style.position='fixed';a.style.left='14px';a.style.bottom='14px';a.style.zIndex='9000';a.style.backdropFilter='blur(12px)';
    }
    host.appendChild(a);
  }
  isOwner().then(owner=>{if(owner)mount()});
  window.addEventListener('focus',()=>isOwner().then(owner=>{if(owner)mount()}));
})();