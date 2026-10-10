// ChatGPT-style StellarX layout and local per-account conversations.
(()=>{
'use strict';
const $=id=>document.getElementById(id),bridge=window.StellarXConversation;
const shell=document.querySelector('.codex-shell'),main=document.querySelector('.codex-main'),head=document.querySelector('.topin'),feed=$('sxMessages'),prompt=$('prompt');
if(!bridge||!shell||!main||!head||!feed||!prompt)return;
document.body.classList.add('sx-workspace');
const side=document.createElement('aside');side.id='sxWorkspaceSidebar';side.setAttribute('aria-label','Chat history');
side.innerHTML='<div class="sx-side-head"><strong>✦ StellarX</strong><button id="sxCloseSidebar" aria-label="Close menu" type="button">×</button></div>'
+'<button class="sx-side-new" id="sxHistoryNew" type="button">＋ New chat</button>'
+'<div class="sx-side-nav"><button id="sxNavChat" type="button">▤ &nbsp; Chat</button><button id="sxNavComputer" type="button">▣ &nbsp; Use my PC</button></div>'
+'<div class="sx-side-heading">Recent</div><div id="sxSavedChats" class="sx-saved-chats"></div>'
+'<p class="sx-side-foot">Chats saved in this browser only.</p>';
shell.prepend(side);
const cover=document.createElement('button');cover.id='sxSidebarBackdrop';cover.type='button';cover.hidden=true;cover.setAttribute('aria-label','Close chat menu');shell.insertBefore(cover,shell.children[1]);
const menu=document.createElement('button');menu.type='button';menu.id='sxSidebarToggle';menu.textContent='☰';menu.setAttribute('aria-label','Open chat menu');menu.setAttribute('aria-expanded','false');head.prepend(menu);
const title=document.createElement('strong');title.id='sxTopTitle';title.textContent='StellarX';head.insertBefore(title,$('codexNewTask')||$('accountPill'));
let storageKey='',chats=[],activeId=null;
const safeMsg=m=>({role:m.role==='user'?'user':'assistant',content:String(m.content||'').slice(0,12000)});
const titleFor=messages=>String(messages.find(m=>m.role==='user')?.content||'New chat').replace(/\s+/g,' ').trim().slice(0,50)||'New chat';
async function getStorageKey(){
 try{
  const data=JSON.parse(localStorage.getItem('stellar-store')||'{}');
  const identity=data.user?.email||data.account?.email||data.session;
  if(!identity||!crypto.subtle)return '';
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(identity).toLowerCase())));
  return 'stellarx-chat-history-v2-'+Array.from(hash.slice(0,12),n=>n.toString(16).padStart(2,'0')).join('');
 }catch{return '';}
}
function persist(){
 if(!storageKey)return;
 try{localStorage.setItem(storageKey,JSON.stringify({activeId,chats:chats.slice(0,25).map(c=>({id:c.id,title:c.title,updated:c.updated,messages:c.messages.slice(-40).map(safeMsg)}))}));}catch{}
}
function closeMenu(){document.body.classList.remove('sx-menu-open');cover.hidden=true;menu.setAttribute('aria-expanded','false');}
function renderList(){
 const holder=$('sxSavedChats');holder.replaceChildren();
 if(!chats.length){const p=document.createElement('p');p.textContent='Your chats will appear here';p.className='sx-no-chats';holder.append(p);return}
 for(const chat of chats){
  const row=document.createElement('div');row.className='sx-chat-link'+(chat.id===activeId?' selected':'');
  const button=document.createElement('button');button.className='sx-open-chat';button.type='button';button.textContent=chat.title;button.title=chat.title;
  button.addEventListener('click',()=>{activeId=chat.id;bridge.restore(chat.messages);persist();renderList();closeMenu()});
  const del=document.createElement('button');del.className='sx-delete-chat';del.type='button';del.textContent='×';del.title='Delete chat';del.setAttribute('aria-label','Delete '+chat.title);
  del.addEventListener('click',()=>{
   if(!confirm('Delete this chat from this browser?'))return;
   const selected=activeId===chat.id;chats=chats.filter(c=>c.id!==chat.id);
   if(selected){activeId=null;bridge.restore([]);}
   persist();renderList();
  });
  row.append(button,del);holder.append(row);
 }
}
window.addEventListener('stellarx:messages-change',e=>{
 if(!storageKey)return;
 const messages=(e.detail?.messages||[]).filter(m=>m.role==='user'||m.role==='assistant').slice(-40).map(safeMsg);
 if(!messages.some(m=>m.role==='user'))return;
 if(!activeId)activeId='sx-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 let chat=chats.find(c=>c.id===activeId);
 if(!chat){chat={id:activeId,title:titleFor(messages),updated:Date.now(),messages:[]};chats.unshift(chat);}
 chat.messages=messages;chat.updated=Date.now();chats.sort((a,b)=>b.updated-a.updated);chats=chats.slice(0,25);
 persist();renderList();
});
window.addEventListener('stellarx:chat-new',()=>{activeId=null;persist();renderList();closeMenu();queueMicrotask(()=>{if(!bridge.messages().length)bridge.restore([])});});
window.addEventListener('stellarx:mode-change',e=>{
 const pc=e.detail?.mode==='computer';
 $('sxNavComputer').classList.toggle('selected',pc);
 $('sxNavChat').classList.toggle('selected',!pc);
 title.textContent=pc?'StellarX · Computer':'StellarX';
});
menu.addEventListener('click',()=>{const yes=document.body.classList.toggle('sx-menu-open');cover.hidden=!yes;menu.setAttribute('aria-expanded',String(yes))});
cover.addEventListener('click',closeMenu);
$('sxCloseSidebar').addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
$('sxHistoryNew').addEventListener('click',()=>{$('codexNewTask')?.click();closeMenu()});
$('sxNavComputer').addEventListener('click',()=>{document.querySelector('[data-sx-mode="computer"]')?.click();closeMenu()});
$('sxNavChat').addEventListener('click',()=>{document.querySelector('[data-sx-mode="chat"]')?.click();closeMenu()});
function copy(value){
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);
 const box=document.createElement('textarea');box.value=value;document.body.append(box);box.select();
 try{document.execCommand('copy')}finally{box.remove()}return Promise.resolve();
}
function inline(target,line){
 const exp=/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;let pos=0,m;
 while((m=exp.exec(line))){
  if(m.index>pos)target.append(document.createTextNode(line.slice(pos,m.index)));
  const token=m[0];
  if(token.startsWith('**')){const b=document.createElement('strong');b.textContent=token.slice(2,-2);target.append(b);}
  else{const parts=/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);const a=document.createElement('a');a.textContent=parts[1];a.href=parts[2];a.target='_blank';a.rel='noopener noreferrer';target.append(a)}
  pos=m.index+token.length;
 }
 if(pos<line.length)target.append(document.createTextNode(line.slice(pos)));
}
function formatMessage(node,text){node.replaceChildren();node.dataset.raw=text;
 const lines=String(text||'').split('\n'),fence=String.fromCharCode(96).repeat(3);
 for(let i=0;i<lines.length;){
  const line=lines[i];
  if(line.startsWith(fence)){
   const code=[];const label=line.slice(3).trim()||'Code';i++;
   while(i<lines.length&&!lines[i].startsWith(fence))code.push(lines[i++]);
   if(i<lines.length)i++;
   const box=document.createElement('div');box.className='sx-code-block';
   const head=document.createElement('div');head.className='sx-code-head';head.textContent=label;
   const pre=document.createElement('pre'),element=document.createElement('code');element.textContent=code.join('\n');pre.append(element);
   box.append(head,pre);node.append(box);continue;
  }
  if(!line.trim()){i++;continue;}
  if(line.startsWith('## ')){
   const h=document.createElement('h3');inline(h,line.slice(3));node.append(h);i++;continue;
  }
  if(line.startsWith('- ')||line.startsWith('* ')){
   const ul=document.createElement('ul');
   while(i<lines.length&&(lines[i].startsWith('- ')||lines[i].startsWith('* '))){
    const li=document.createElement('li');inline(li,lines[i].slice(2));ul.append(li);i++;
   }
   node.append(ul);continue;
  }
  const p=document.createElement('p');inline(p,line);node.append(p);i++;
 }
}
window.stellarxFormatMessage=formatMessage;
function enhance(row){
 if(row.dataset.enhanced)return;
 const bubble=row.querySelector('.sx-bubble');if(!bubble)return;
 row.dataset.enhanced='yes';
 if(row.classList.contains('assistant')&&!row.classList.contains('waiting'))formatMessage(bubble,bubble.textContent);
 const actions=document.createElement('div');actions.className='sx-chat-actions';
 const cp=document.createElement('button');cp.type='button';cp.textContent='Copy';cp.setAttribute('aria-label','Copy message');
 cp.addEventListener('click',()=>copy(bubble.dataset.raw||bubble.textContent||'').then(()=>cp.textContent='Copied').catch(()=>cp.textContent='Copy failed'));
 actions.append(cp);row.append(actions);
}
const observer=new MutationObserver(()=>feed.querySelectorAll('.sx-msg:not([data-enhanced])').forEach(enhance));
observer.observe(feed,{childList:true,subtree:true});feed.querySelectorAll('.sx-msg').forEach(enhance);
const resize=()=>{prompt.style.height='auto';prompt.style.height=Math.min(210,Math.max(54,prompt.scrollHeight))+'px'};
prompt.addEventListener('input',resize);resize();
(async()=>{
 storageKey=await getStorageKey();
 if(storageKey){
  try{
   const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
   chats=Array.isArray(saved.chats)?saved.chats.filter(c=>c?.id&&Array.isArray(c.messages)).slice(0,25):[];
   activeId=saved.activeId||null;
  }catch{}
 }
 renderList();
 if(!prompt.value.trim()){
  const chat=chats.find(c=>c.id===activeId);
  bridge.restore(chat?chat.messages:[]);
 }else activeId=null;
})();
})();
