(()=> {
  const BUTTON_ID='stellar-pc-agent-button';
  const BAR_ID='stellar-pc-active-bar';
  const FRAME_ID='stellar-pc-led-frame';
  const ONLINE_SIDE_ID='stellarx-pc-online-side';
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
      bar.innerHTML='<span class="stellar-pc-pulse" aria-hidden="true"></span><strong>StellarX Work Agent</strong><small>StellarX is using your PC to help complete this task.</small><a href="/desktop">View task</a><button type="button">Emergency Stop</button>';
      const style=document.createElement('style');style.id=BAR_ID+'-style';
      style.textContent="#stellar-pc-active-bar{position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:12px;min-height:46px;padding:7px 14px;background:#18181c;color:#f4f4f5;box-shadow:none;font:750 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:-.005em;border-bottom:1px solid rgba(155,140,255,.3)}\n#stellar-pc-active-bar strong{font-weight:800}\n#stellar-pc-active-bar small{font-weight:600;color:#b5b5bb}\n#stellar-pc-active-bar a,#stellar-pc-active-bar button{min-height:32px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:#242428;color:#f4f4f5;padding:0 11px;font:700 11px/1 system-ui,sans-serif;text-decoration:none;cursor:pointer;box-shadow:none}\n#stellar-pc-active-bar .stellar-pc-pulse{width:8px;height:8px;border-radius:50%;background:#9b8cff;box-shadow:0 0 0 4px rgba(155,140,255,.12);animation:none}\n#stellar-pc-led-frame{position:fixed;inset:0;z-index:2147482999;pointer-events:none;border:1px solid rgba(155,140,255,.22);box-shadow:inset 0 0 0 1px rgba(155,140,255,.04);animation:none}\n#stellar-pc-led-frame:before,#stellar-pc-led-frame:after,#stellar-pc-led-frame i,#stellar-pc-led-frame b{display:none}\n#stellar-pc-led-frame .stellarx-side-label{position:fixed;left:14px;bottom:14px;top:auto;transform:none;writing-mode:horizontal-tb;text-orientation:mixed;letter-spacing:0;text-transform:none;border:1px solid rgba(155,140,255,.22);border-radius:999px;background:#1b1b1f;color:#d8d2ff;padding:8px 10px;font:750 10px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:none;text-shadow:none}\n@media(max-width:680px){#stellar-pc-active-bar{justify-content:flex-start;overflow:auto;min-height:44px}#stellar-pc-active-bar small{display:none}#stellar-pc-led-frame .stellarx-side-label{display:none}}";
      document.head.appendChild(style);
      bar.querySelector('button').addEventListener('click',emergencyStop);
      document.body.appendChild(bar);
    }
    if(!frame){frame=document.createElement('div');frame.id=FRAME_ID;frame.innerHTML='<i aria-hidden="true"></i><b aria-hidden="true"></b><span class="stellarx-side-label" aria-hidden="true">StellarX is using your PC</span>';document.body.appendChild(frame)}
    bar.querySelector('small').textContent='StellarX is using your PC · '+(status.activeTask.type||'task')+' · '+(status.hostname||'Windows PC');
  }
  function mount(){
    if(document.getElementById(BUTTON_ID))return;
    const host=document.querySelector('.sidebar-footer,.sidebar__footer,[data-sidebar-footer],aside .bottom,aside nav,.sidebar')||document.body;
    const a=document.createElement('a');
    a.id=BUTTON_ID;
    a.href='/desktop';
    a.title='StellarX Work Agent — structured tasks with your paired Windows workspace';
    a.setAttribute('aria-label','Open StellarX Work Agent');
    a.innerHTML='<span aria-hidden="true" style="font-size:16px">⌘</span><span class="stellar-pc-label">StellarX Work Agent</span>';
    a.style.cssText='display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 12px;margin:8px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.045);color:inherit;text-decoration:none;font:700 12px/1 system-ui,sans-serif;cursor:pointer;touch-action:manipulation';
    a.addEventListener('mouseenter',()=>a.style.background='rgba(255,255,255,.08)');
    a.addEventListener('mouseleave',()=>a.style.background='rgba(255,255,255,.045)');
    if(host===document.body){a.style.position='fixed';a.style.left='14px';a.style.bottom='14px';a.style.zIndex='9000';a.style.backdropFilter='blur(12px)'}
    host.appendChild(a);
  }
  function renderOnlineSide(status){
    let side=document.getElementById(ONLINE_SIDE_ID);
    const online=status?.paired&&status?.online&&!status?.activeTask&&!status?.emergencyStopped;
    if(!online){side?.remove();return}
    if(!side){
      side=document.createElement('div');side.id=ONLINE_SIDE_ID;side.textContent='StellarX Computer Online';
      const style=document.createElement('style');style.id=ONLINE_SIDE_ID+'-style';
      style.textContent='#stellarx-pc-online-side{position:fixed;left:14px;bottom:14px;z-index:2147482998;letter-spacing:0;border:1px solid rgba(115,226,183,.2);border-radius:999px;background:#181b19;color:#bff3d9;padding:8px 10px;font:750 10px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:none;pointer-events:none}@media(max-width:680px){#stellarx-pc-online-side{display:none}}';
      document.head.appendChild(style);document.body.appendChild(side);
    }
  }
  async function tick(){const status=await pcStatus();renderActiveBar(status);renderOnlineSide(status)}
  isSignedIn().then(ok=>{if(ok){mount();tick();setInterval(tick,8000)}});
  window.addEventListener('focus',()=>isSignedIn().then(ok=>{if(ok){mount();tick()}}));
})();
