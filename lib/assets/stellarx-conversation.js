// StellarX chat-first experience. Conversation is isolated from permissioned PC actions.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const composer=$('taskComposer'),prompt=$('prompt'),send=$('planBtn'),main=document.querySelector('.codex-main');
if(!composer||!prompt||!send||!main)return;
const originalComputerTask=send.onclick;
if($('codexNewTask'))$('codexNewTask').textContent='＋ New chat';
const tabs=document.createElement('div');
tabs.id='sxModeTabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','StellarX mode');
tabs.innerHTML='<button class="sx-mode" type="button" data-sx-mode="chat" aria-pressed="true">Chat</button><button class="sx-mode" type="button" data-sx-mode="computer" aria-pressed="false">Use my PC</button>';
const feed=document.createElement('section');
feed.id='sxMessages';feed.setAttribute('role','log');feed.setAttribute('aria-label','StellarX conversation');feed.setAttribute('aria-live','polite');
const stop=document.createElement('button');stop.id='sxStop';stop.type='button';stop.hidden=true;stop.textContent='Stop response';
const error=document.createElement('div');error.id='sxChatError';error.hidden=true;error.setAttribute('role','alert');
const disclaimer=document.createElement('p');disclaimer.className='sx-chat-disclaimer';disclaimer.textContent='Chat uses your Stellar plan allowance. Computer actions require your approval.';
main.insertBefore(tabs,composer);
main.insertBefore(feed,composer);
main.insertBefore(stop,composer);
composer.insertBefore(error,composer.querySelector('.task-head')||composer.firstChild);
composer.after(disclaimer);
document.body.classList.add('stellarx-conversation');
const hero=document.querySelector('.work-hero h1');
const lead=document.querySelector('.work-hero .lead');
let mode='chat',history=[],busy=false,abortController=null,conversationId=0;
function bubble(role,text='',waiting=false){
  const row=document.createElement('div');row.className='sx-msg '+role+(waiting?' waiting':'');
  const label=document.createElement('span');label.className='sx-who';label.textContent=role==='user'?'You':'StellarX';
  const content=document.createElement('div');content.className='sx-bubble';content.textContent=text;
  row.append(label,content);feed.append(row);feed.scrollTop=feed.scrollHeight;
  return {row,content};
}
function showError(message){error.hidden=false;error.textContent=String(message||'Something went wrong. Try again.');}
function clearError(){error.hidden=true;error.textContent='';}
function greeting(value){
  return /^(?:hi+|hey+|hello+|hiya|yo+|sup|good (?:morning|afternoon|evening)|how are you|what can you do|thanks|thank you)[!?.\s]*$/i.test(String(value||'').trim());
}
function setMode(next){
  mode=next==='computer'?'computer':'chat';
  document.body.classList.toggle('sx-chat-mode',mode==='chat');
  for(const button of tabs.querySelectorAll('button'))button.setAttribute('aria-pressed',button.dataset.sxMode===mode?'true':'false');
  const chatting=mode==='chat';
  feed.hidden=!chatting;
  stop.hidden=!chatting||!busy;
  disclaimer.hidden=!chatting;
  if(hero)hero.textContent=chatting?'What can StellarX help with?':'Give StellarX a job.';
  if(lead)lead.textContent=chatting?'Chat naturally, ask questions, or switch to Use my PC when you want StellarX to work on your computer.':'Describe what needs doing. StellarX checks your project and asks before changing anything.';
  prompt.placeholder=chatting?'Message StellarX…':'e.g. Fix the broken button on my website and test it';
  send.textContent=chatting?'↑':'Start task →';
  send.setAttribute('aria-label',chatting?'Send chat message':'Start a computer task');
  send.disabled=busy;
  window.dispatchEvent(new CustomEvent('stellarx:mode-change',{detail:{mode}}));
  if(chatting)prompt.focus();
}
function parseEvent(raw){
  try{
    const event=JSON.parse(raw);
    if(event?.type==='error')throw new Error(event.error?.message||'AI could not complete the response.');
    if(event?.type==='content_block_delta'&&event?.delta?.type==='text_delta')return event.delta.text||'';
    return event?.delta?.text||event?.text||(typeof event?.choices?.[0]?.delta?.content==='string'?event.choices[0].delta.content:'')||'';
  }catch(e){if(e?.message?.startsWith('AI could not'))throw e;return '';}
}
async function sendChat(text){
  text=String(text||'').trim();
  if(!text||busy)return;
  setMode('chat');clearError();
  busy=true;send.disabled=true;stop.hidden=false;
  document.body.classList.add('sx-has-messages');
  const sentInConversation=conversationId;
  history.push({role:'user',content:text});
  const user=bubble('user',text);
  const reply=bubble('assistant','Thinking…',true);
  prompt.value='';
  abortController=new AbortController();let result='';
  try{
    const session=String(JSON.parse(localStorage.getItem('stellar-store')||'{}')?.session||'');
    if(!session)throw new Error('Sign in to Stellar AI to chat with StellarX.');
    const response=await fetch('/api/chat',{
      method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+session},
      body:JSON.stringify({action:'chat',model:'spark',selectedModel:'spark',messages:history.slice(-20),client:{source:'stellarx-chat'}}),
      signal:abortController.signal,
    });
    if(!response.ok){
      const payload=await response.json().catch(()=>({}));
      throw new Error(payload.error||'StellarX could not respond. Try again.');
    }
    if(!response.body)throw new Error('StellarX did not return a response.');
    const reader=response.body.getReader(),decoder=new TextDecoder();
    let buffer='';
    const consume=line=>{
      if(!line.startsWith('data:'))return;
      const raw=line.slice(5).trim();
      if(!raw||raw==='[DONE]')return;
      const text=parseEvent(raw);
      if(text){result+=text;reply.row.classList.remove('waiting');if(window.stellarxFormatMessage)window.stellarxFormatMessage(reply.content,result);else reply.content.textContent=result;feed.scrollTop=feed.scrollHeight;}
    };
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const lines=buffer.split(/\r?\n/);
      buffer=lines.pop()||'';
      for(const line of lines)consume(line);
    }
    buffer+=decoder.decode();
    if(buffer.trim())consume(buffer.trim());
    if(!result.trim())throw new Error('StellarX did not produce an answer. Please try again.');
    if(sentInConversation===conversationId){history.push({role:'assistant',content:result});window.dispatchEvent(new CustomEvent('stellarx:messages-change',{detail:{messages:history.slice()}}));}
  }catch(err){
    if(sentInConversation!==conversationId)return;
    if(result.trim()){
      history.push({role:'assistant',content:result});
      window.dispatchEvent(new CustomEvent('stellarx:messages-change',{detail:{messages:history.slice()}}));
      if(err.name!=='AbortError')showError('The answer was interrupted. You can send another message.');
    }else{
      history.pop();
      user.row.remove();reply.row.remove();
      prompt.value=text;
      if(err.name!=='AbortError')showError(err.message||'Could not send message.');
    }
  }finally{
    reply.row.classList.remove('waiting');
    busy=false;abortController=null;
    stop.hidden=true;send.disabled=false;
    if(mode==='chat')prompt.focus();
  }
}
tabs.addEventListener('click',event=>{
  const button=event.target.closest('[data-sx-mode]');
  if(button){clearError();setMode(button.dataset.sxMode);}
});
stop.addEventListener('click',()=>abortController?.abort());
send.onclick=async()=>{
  const text=prompt.value.trim();if(!text)return;
  if(mode==='chat'||greeting(text)){await sendChat(text);return;}
  await originalComputerTask?.();
};
$('codexNewTask')?.addEventListener('click',()=>{
  conversationId++;abortController?.abort();history=[];feed.replaceChildren();clearError();
  window.dispatchEvent(new CustomEvent('stellarx:chat-new'));
  document.body.classList.remove('sx-has-messages');
  bubble('assistant','Hi! I’m StellarX. Ask me anything, or choose Use my PC when you want me to work on your computer.');
  setMode('chat');
});
bubble('assistant','Hi! I’m StellarX. Ask me anything, or choose Use my PC when you want me to work on your computer.');
// Expose a narrow UI bridge: no session tokens, browser permissions or device tools.
window.StellarXConversation={
  messages:()=>history.map(message=>({role:message.role,content:message.content})),
  restore(messages){
    conversationId++;abortController?.abort();clearError();
    history=(Array.isArray(messages)?messages:[]).filter(m=>['user','assistant'].includes(m?.role)&&typeof m?.content==='string').slice(-40).map(m=>({role:m.role,content:m.content.slice(0,12000)}));
    feed.replaceChildren();
    for(const message of history){const created=bubble(message.role,message.content);if(message.role==='assistant'&&window.stellarxFormatMessage)window.stellarxFormatMessage(created.content,message.content)}
    document.body.classList.toggle('sx-has-messages',history.length>0);
    prompt.value='';setMode('chat');
  },
};
// Preserve reviewed task handoffs from the main Stellar chat.
setMode(prompt.value.trim()?'computer':'chat');
})();
