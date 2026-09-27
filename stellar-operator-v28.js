(()=>{
  const MODE_KEY='stellar-work-mode-v1';
  const MODES=new Set(['auto','chat','action']);
  const $=id=>document.getElementById(id);

  function readMode(){
    try{
      const value=String(localStorage.getItem(MODE_KEY)||'auto').toLowerCase();
      return MODES.has(value)?value:'auto';
    }catch{return 'auto'}
  }
  let mode=readMode();

  function writeMode(next){
    mode=MODES.has(String(next||'').toLowerCase())?String(next).toLowerCase():'auto';
    try{localStorage.setItem(MODE_KEY,mode)}catch{}
    document.body.dataset.stellarWorkMode=mode;
    const select=$('stellar-work-mode');
    if(select&&select.value!==mode)select.value=mode;
    syncCopy();
    updateRouteBadge();
    try{window.metric?.('work-mode-'+mode)}catch{}
  }

  function signedIn(){
    try{return Boolean(typeof window.getSessionToken==='function'&&window.getSessionToken())}catch{return false}
  }

  function modelButton(key){
    return document.querySelector('#model-menu [data-model-choice="'+key+'"]');
  }

  function unlocked(key){
    if(key==='spark'||key==='star')return true;
    try{
      if(typeof window.modelAllowed==='function')return Boolean(window.modelAllowed(key));
    }catch{}
    const button=modelButton(key);
    return Boolean(button&&!button.disabled&&button.getAttribute('data-locked')!=='true');
  }

  function complexity(text){
    const value=String(text||'').trim().toLowerCase();
    if(!value)return 0;
    const words=value.split(/\s+/).filter(Boolean).length;
    let score=0;
    if(words>30)score+=1;
    if(words>90)score+=1;
    if(words>180)score+=1;
    const hard=[
      /\b(debug|bug|broken|error|fix)\b/,
      /\b(code|coding|script|api|database|backend|frontend|deploy|github|repository|repo)\b/,
      /\b(architecture|security|refactor|migration|integration|performance)\b/,
      /\b(analy[sz]e|research|compare|strategy|plan|review|audit)\b/,
      /\b(multi[- ]?step|multiple files|whole app|entire app|everything|all of it)\b/
    ];
    score+=hard.reduce((n,re)=>n+(re.test(value)?1:0),0);
    if(/[{}<>]|\b(function|const|let|class|sql|json|typescript|javascript|python|lua)\b/.test(value))score+=1;
    return score;
  }

  function chooseAutoModel(text){
    const words=String(text||'').trim().split(/\s+/).filter(Boolean).length;
    const score=complexity(text);
    let choice=(words<=16&&score===0)?'spark':'star';
    if(score>=3&&unlocked('comet'))choice='comet';
    if(score>=6&&unlocked('nova'))choice='nova';
    return choice;
  }

  function labelForModel(key){
    return {spark:'Spark',star:'Star',comet:'Comet',nova:'Nova'}[key]||'Star';
  }

  function currentModelKey(){
    const checked=document.querySelector('#model-menu [data-model-choice][aria-checked="true"]');
    return String(checked?.getAttribute('data-model-choice')||'star').toLowerCase();
  }

  function updateRouteBadge(key){
    const badge=$('stellar-route-badge');
    if(!badge)return;
    if(mode==='action'){
      badge.textContent='Approval flow';
      badge.title='Action mode opens StellarX and asks for approval before computer work.';
      return;
    }
    const selected=key||currentModelKey();
    badge.textContent=mode==='auto'?'Auto · '+labelForModel(selected):labelForModel(selected);
    badge.title=mode==='auto'?'Auto chooses the lightest suitable unlocked Stellar tier.':'Chat uses your selected Stellar model.';
  }

  function applyAutoRoute(text){
    const choice=chooseAutoModel(text);
    try{
      if(typeof window.applyModelSelection==='function'){
        window.applyModelSelection(choice,{persist:false,announce:false});
      }else{
        modelButton(choice)?.click?.();
      }
    }catch{}
    updateRouteBadge(choice);
    try{window.metric?.('auto-route-'+choice)}catch{}
    return choice;
  }

  function syncCopy(){
    const prompt=$('prompt');
    if(prompt){
      prompt.placeholder=mode==='action'
        ?'Describe the outcome for StellarX…'
        :mode==='auto'
          ?'Tell Stellar what you want done…'
          :'Message Stellar AI…';
      prompt.setAttribute('aria-label',mode==='action'
        ?'Describe an Action task. StellarX will show an approval step before computer work.'
        :'Message Stellar AI. Press Enter to send and Shift+Enter for a new line.');
    }
    const hint=$('welcome-copy');
    if(hint){
      hint.textContent=mode==='action'
        ?'Describe the outcome. StellarX will show what it plans to do before computer actions.'
        :'Tell Stellar what you want done. Auto chooses the right level; switch to Action for approved computer work.';
    }
  }

  function mountModeControl(){
    const tools=document.querySelector('#chatForm .composer-tools');
    if(!tools||$('stellar-mode-rail'))return;
    const rail=document.createElement('div');
    rail.id='stellar-mode-rail';
    rail.className='stellar-mode-rail';
    rail.innerHTML='<span class="stellar-mode-mark" aria-hidden="true">✦</span><label class="sr-only" for="stellar-work-mode">Stellar work mode</label><select id="stellar-work-mode" class="stellar-mode-select" aria-label="Stellar work mode"><option value="auto">Auto</option><option value="chat">Chat</option><option value="action">Action</option></select><span id="stellar-route-badge" class="stellar-route-badge" aria-live="polite"></span>';
    const plus=$('composer-more-btn');
    if(plus?.nextSibling)tools.insertBefore(rail,plus.nextSibling);else tools.appendChild(rail);
    $('stellar-work-mode')?.addEventListener('change',event=>writeMode(event.target.value));
    writeMode(mode);
  }

  function mountOperatorNote(){
    const more=$('composer-more');
    if(!more||more.querySelector('.stellar-operator-note'))return;
    const note=document.createElement('div');
    note.className='stellar-operator-note';
    note.innerHTML='<div class="stellar-operator-note-copy"><strong>Stellar Operator</strong><small>For bigger jobs, Action mode hands the task to StellarX with approval gates around computer actions.</small></div><button type="button" class="btn" data-stellar-use-action>Use Action</button>';
    note.querySelector('[data-stellar-use-action]')?.addEventListener('click',()=>{
      writeMode('action');
      try{window.toggleComposerMore?.(false)}catch{}
      $('prompt')?.focus();
    });
    more.appendChild(note);
  }

  function onSubmitCapture(event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='chatForm')return;
    const text=String($('prompt')?.value||'').trim();
    if(!text)return;
    if(mode==='action'){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(!signedIn()){
        try{window.openComputerActionCard?.()}catch{}
        return;
      }
      try{
        window.setStatus?.('Review the Action card before StellarX opens.','warn');
        window.openComputerActionCard?.();
      }catch{}
      return;
    }
    if(mode==='auto')applyAutoRoute(text);
  }

  function observeModelChoice(){
    const menu=$('model-menu');
    if(!menu||!('MutationObserver'in window))return;
    new MutationObserver(()=>updateRouteBadge()).observe(menu,{subtree:true,attributes:true,attributeFilter:['aria-checked','data-locked']});
  }

  function init(){
    mountModeControl();
    mountOperatorNote();
    syncCopy();
    updateRouteBadge();
    observeModelChoice();
    const form=$('chatForm');
    if(form&&!form.dataset.stellarModeCapture){
      form.dataset.stellarModeCapture='1';
      form.addEventListener('submit',onSubmitCapture,true);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.addEventListener('pageshow',()=>{mountModeControl();mountOperatorNote();syncCopy();updateRouteBadge()});
  window.StellarOperator={
    setMode:writeMode,
    getMode:()=>mode,
    chooseAutoModel
  };
})();