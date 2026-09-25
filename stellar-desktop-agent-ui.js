(()=> {
  const BUTTON_ID='stellar-pc-agent-button';
  const BAR_ID='stellar-pc-active-bar';
  const FRAME_ID='stellar-pc-led-frame';
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
    let frame=document.getElementById(FRAME_ID);
    const active=status?.activeTask&&!status?.emergencyStopped;
    if(!active){bar?.remove();frame?.remove();return}
    if(!bar){
      bar=document.createElement('div');bar.id=BAR_ID;
      bar.innerHTML='<span class="stellar-pc-pulse" aria-hidden="true"></span><strong>Stellar AI is using your PC</strong><small></small><a href="/desktop">View task</a><button type="button">Emergency Stop</button>';
      const style=document.createElement('style');style.id=BAR_ID+'-style';
      style.textContent="#stellar-pc-active-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:13px;min-height:50px;padding:8px 16px;background:linear-gradient(92deg,#0037ff 0%,#087dff 42%,#54e5ff 100%);color:#fff;box-shadow:0 16px 46px rgba(0,110,255,.55),0 0 32px rgba(76,226,255,.42);font:900 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:-.01em;border-bottom:1px solid rgba(255,255,255,.35)}\n#stellar-pc-active-bar strong{text-shadow:0 0 14px rgba(255,255,255,.38)}\n#stellar-pc-active-bar small{font-weight:750;opacity:.94}\n#stellar-pc-active-bar a,#stellar-pc-active-bar button{min-height:32px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:rgba(0,0,0,.18);color:#fff;padding:0 12px;font:900 12px/1 system-ui,sans-serif;text-decoration:none;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}\n#stellar-pc-active-bar .stellar-pc-pulse{width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 0 0 rgba(255,255,255,.72),0 0 20px rgba(255,255,255,.9);animation:stellarPcPulse 1.25s infinite}\n#stellar-pc-led-frame{position:fixed;inset:0;z-index:2147482999;pointer-events:none;border:1px solid rgba(83,221,255,.76);box-shadow:inset 0 0 34px rgba(0,132,255,.5),inset 0 0 110px rgba(0,102,255,.24),0 0 54px rgba(0,132,255,.55);animation:stellarPcEdge 1.8s ease-in-out infinite}\n#stellar-pc-led-frame:before,#stellar-pc-led-frame:after{content:\"\";position:absolute;top:0;bottom:0;width:11px;background:linear-gradient(180deg,transparent 0%,#4fe7ff 14%,#006bff 50%,#4fe7ff 86%,transparent 100%);filter:blur(1.3px);box-shadow:0 0 34px rgba(44,207,255,.9),0 0 70px rgba(0,93,255,.42)}\n#stellar-pc-led-frame:before{left:0}#stellar-pc-led-frame:after{right:0}\n#stellar-pc-led-frame i{position:absolute;left:0;right:0;bottom:0;height:9px;background:linear-gradient(90deg,transparent,#006fff 16%,#5deaff 50%,#006fff 84%,transparent);filter:blur(1.2px);box-shadow:0 0 30px rgba(42,194,255,.82)}\n#stellar-pc-led-frame b{position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.48),transparent);filter:blur(1px)}\n@keyframes stellarPcPulse{70%{box-shadow:0 0 0 11px rgba(255,255,255,0),0 0 20px rgba(255,255,255,.9)}}\n@keyframes stellarPcEdge{50%{border-color:rgba(143,237,255,.98);box-shadow:inset 0 0 44px rgba(0,153,255,.62),inset 0 0 136px rgba(0,102,255,.34),0 0 70px rgba(0,145,255,.7)}}\n@media(max-width:680px){#stellar-pc-active-bar{justify-content:flex-start;overflow:auto;min-height:45px}#stellar-pc-active-bar small{display:none}#stellar-pc-led-frame:before,#stellar-pc-led-frame:after{width:6px}#stellar-pc-led-frame i{height:6px}}\n@media(prefers-reduced-motion:reduce){#stellar-pc-active-bar .stellar-pc-pulse,#stellar-pc-led-frame{animation:none}}";
      document.head.appendChild(style);
      bar.querySelector('button').addEventListener('click',emergencyStop);
      document.body.appendChild(bar);
    }
    if(!frame){frame=document.createElement('div');frame.id=FRAME_ID;frame.innerHTML='<i aria-hidden="true"></i><b aria-hidden="true"></b>';document.body.appendChild(frame)}
    bar.querySelector('small').textContent=(status.activeTask.type||'task')+' · '+(status.hostname||'Windows PC');
  }
  function mount(){
    if(document.getElementById(BUTTON_ID))return;
    const host=document.querySelector('.sidebar-footer,.sidebar__footer,[data-sidebar-footer],aside .bottom,aside nav,.sidebar')||document.body;
    const a=document.createElement('a');
    a.id=BUTTON_ID;
    a.href='/desktop';
    a.title='Work Agent Beta — Codex-style tasks with your paired Windows workspace';
    a.setAttribute('aria-label','Open Work Agent');
    a.innerHTML='<span aria-hidden="true" style="font-size:16px">⌘</span><span class="stellar-pc-label">Work Agent</span>';
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
