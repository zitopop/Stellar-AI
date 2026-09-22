(()=> {
  const BUTTON_ID='stellar-pc-agent-button';
  const BAR_ID='stellar-pc-active-bar';
  function sessionToken(){
    try{return String(JSON.parse(localStorage.getItem('stellar-store')||'{}')?.session||'')}catch{return ''}
  }
  async function isSignedIn(){
    const token=sessionToken(); if(!token)return false;
    try{
      const r=await fetch('/api/get-plan',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      await r.json().catch(()=>({}));
      return r.ok;
    }catch{return false}
  }
  async function pcStatus(){
    const token=sessionToken(); if(!token)return null;
    try{
      const r=await fetch('/api/desktop-agent?action=status',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(!r.ok)return null; return await r.json().catch(()=>null);
    }catch{return null}
  }
  async function emergencyStop(){
    const token=sessionToken(); if(!token)return;
    if(!confirm('Emergency Stop will clear queued PC tasks and block new PC Agent work. Continue?'))return;
    await fetch('/api/desktop-agent',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'emergencyStop'})}).catch(()=>{});
    renderActiveBar(null);
  }
  function renderActiveBar(status){
    let bar=document.getElementById(BAR_ID);
    const active=status?.activeTask&&!status?.emergencyStopped;
    if(!active){bar?.remove();return}
    if(!bar){
      bar=document.createElement('div');bar.id=BAR_ID;
      bar.innerHTML='<span class="stellar-pc-pulse" aria-hidden="true"></span><strong>Stellar AI is using your PC</strong><small></small><a href="/desktop">View task</a><button type="button">Emergency Stop</button>';
      const style=document.createElement('style');style.id=BAR_ID+'-style';
      style.textContent=`#${BAR_ID}{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:12px;min-height:44px;padding:7px 12px;background:linear-gradient(90deg,#075cff,#18a8ff);color:#fff;box-shadow:0 14px 35px rgba(0,91,255,.35);font:800 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:-.01em}#${BAR_ID} small{font-weight:650;opacity:.9}#${BAR_ID} a,#${BAR_ID} button{min-height:30px;border:1px solid rgba(255,255,255,.6);border-radius:999px;background:rgba(0,0,0,.16);color:#fff;padding:0 11px;font:800 12px/1 system-ui,sans-serif;text-decoration:none;cursor:pointer}#${BAR_ID} .stellar-pc-pulse{width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 0 rgba(255,255,255,.65);animation:stellarPcPulse 1.3s infinite}@keyframes stellarPcPulse{70%{box-shadow:0 0 0 10px rgba(255,255,255,0)}}@media(max-width:680px){#${BAR_ID}{justify-content:flex-start;overflow:auto}#${BAR_ID} small{display:none}}`;
      document.head.appendChild(style);
      bar.querySelector('button').addEventListener('click',emergencyStop);
      document.body.appendChild(bar);
    }
    bar.querySelector('small').textContent=(status.activeTask.type||'task')+' · '+(status.hostname||'Windows PC');
  }
  function mount(){
    if(document.getElementById(BUTTON_ID))return;
    const host=document.querySelector('.sidebar-footer,.sidebar__footer,[data-sidebar-footer],aside .bottom,aside nav,.sidebar')||document.body;
    const a=document.createElement('a');
    a.id=BUTTON_ID;
    a.href='/desktop';
    a.title='PC Agent Beta — work with your paired Windows workspace';
    a.setAttribute('aria-label','Open PC Agent');
    a.innerHTML='<span aria-hidden="true" style="font-size:16px">⌘</span><span class="stellar-pc-label">PC Agent</span>';
    a.style.cssText='display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 12px;margin:8px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.045);color:inherit;text-decoration:none;font:700 12px/1 system-ui,sans-serif;cursor:pointer;touch-action:manipulation';
    a.addEventListener('mouseenter',()=>a.style.background='rgba(255,255,255,.08)');
    a.addEventListener('mouseleave',()=>a.style.background='rgba(255,255,255,.045)');
    if(host===document.body){a.style.position='fixed';a.style.left='14px';a.style.bottom='14px';a.style.zIndex='9000';a.style.backdropFilter='blur(12px)'}
    host.appendChild(a);
  }
  async function tick(){renderActiveBar(await pcStatus())}
  isSignedIn().then(ok=>{if(ok){mount();tick();setInterval(tick,8000)}});
  window.addEventListener('focus',()=>isSignedIn().then(ok=>{if(ok){mount();tick()}}));
})();
