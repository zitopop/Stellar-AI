import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const send = html.slice(html.indexOf('    async function sendMessage('), html.indexOf('    function refreshModelMenu('));
const commit = html.slice(html.indexOf('    function commitPendingChat('), html.indexOf('    function timeGreeting('));

test('thinking updates work before and after the stream status is created', () => {
  const thinking = html.slice(html.indexOf('    function setThinking('), html.indexOf('    function streamView('));
  const progress = {};
  let stream = null;
  const statuses = [];
  const context = vm.createContext({
    document: { getElementById: () => progress, querySelector: () => stream },
    setGenerationStatus: label => statuses.push(label)
  });
  vm.runInContext(thinking, context);
  context.setThinking('', 'Reading your request');
  assert.equal(progress.textContent, 'Reading your request');
  stream = {};
  context.setThinking('', 'Writing response');
  assert.equal(stream.textContent, 'Writing response');
  assert.deepEqual(statuses, ['Reading your request', 'Writing response']);
});

function harness({ text = 'Build a checkpoint', pending = true, saved = [] } = {}) {
  let stored = { chats: structuredClone(saved), currentChat:'draft', plan:'free' };
  const input = { value:text };
  const status = [];
  const elements = { txt:input, 'chat-title':{}, chat:{setAttribute(){}} };
  const boundary = new Error('Request preparation completed');
  const context = vm.createContext({
    document:{ getElementById:id=>elements[id] },
    Store:{ get:()=>structuredClone(stored), set:data=>{stored={...stored,...structuredClone(data)};} },
    chats:structuredClone(saved), currentChatId:'draft', pendingChat:pending,
    currentAbort:null, sendLock:false, uploadedImage:null,
    renderChatList(){}, loadChat(){}, removeImage(){}, syncComposerInputState(){},
    setSendControl(){}, setGenerationStatus:message=>status.push(message),
    // End at the network-preparation boundary; the production function above
    // executes unchanged, including draft persistence and first-message storage.
    needsSearch(){throw boundary;}
  });
  vm.runInContext(commit + '\n' + send, context);
  return {context,input,status,boundary,state:()=>stored};
}

test('the first message commits the draft before reading its saved chat', async () => {
  const h = harness({saved:[{id:'older',name:'Existing build',messages:[{role:'user',content:'Keep this'}]}]});
  await assert.rejects(h.context.sendMessage(), error=>error === h.boundary);
  assert.equal(h.state().chats.length, 2);
  const draft = h.state().chats.find(x=>x.id==='draft');
  assert.equal(draft.messages.length, 1);
  assert.equal(draft.messages[0].content, 'Build a checkpoint');
  assert.equal(h.state().chats.find(x=>x.id==='older').messages[0].content, 'Keep this');
  assert.equal(h.input.value, '');
});

test('blank input leaves the greeting and unsaved draft untouched', async () => {
  const h = harness({text:'  \n  '});
  await h.context.sendMessage();
  assert.equal(h.context.pendingChat, true);
  assert.equal(h.context.sendLock, false);
  assert.equal(h.state().chats.length, 0);
  assert.equal(h.input.value, '  \n  ');
});

test('a missing retry chat recovers without throwing or stranding Send', async () => {
  const h = harness({pending:false});
  await h.context.sendMessage({text:'Retry old message'});
  assert.equal(h.context.sendLock, false);
  assert.equal(h.state().chats.length, 0);
  assert.match(h.status.at(-1), /Start a new build/);
  assert.equal(h.input.value, 'Build a checkpoint');
});

test('a delayed retry leaves the newly selected chat and composer untouched', async () => {
  const h = harness({
    text:'Draft for the current build',
    pending:false,
    saved:[
      {id:'older',name:'Previous build',messages:[{role:'user',content:'Read my first image'}]},
      {id:'draft',name:'Current build',messages:[{role:'user',content:'Keep this conversation'}]}
    ]
  });
  const nextAttachment = {data:'current-image',mediaType:'image/png',name:'current.png'};
  h.context.uploadedImage = nextAttachment;
  const before = structuredClone(h.state());
  h.context.Store.set = () => assert.fail('A stale retry must not write storage');
  h.context.document.getElementById('chat').setAttribute = () => assert.fail('A stale retry must not start generation');

  // The retry callback fires after the active chat has changed from older to draft.
  // Without the chat-ID guard, the production send function reaches needsSearch
  // and rejects at the request-preparation boundary instead of resolving.
  await h.context.sendMessage({
    text:'Read my first image',
    image:{data:'previous-image',mediaType:'image/png',name:'previous.png'},
    chatId:'older'
  });

  assert.deepEqual(h.state(), before);
  assert.equal(h.context.currentChatId, 'draft');
  assert.equal(h.context.pendingChat, false);
  assert.equal(h.context.sendLock, false);
  assert.equal(h.context.currentAbort, null);
  assert.equal(h.input.value, 'Draft for the current build');
  assert.equal(h.context.uploadedImage, nextAttachment);
  assert.deepEqual(h.status, []);
});
