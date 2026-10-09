import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { requestedPluginId } from '../lib/plugin-chat-context.js';
import { inspectProvider } from '../lib/plugin-providers.js';

const latest = content => [{role:'user',content}];

test('only explicit user requests select a connected provider', () => {
  assert.equal(requestedPluginId(latest('Summarise my latest Gmail inbox messages')), 'gmail');
  assert.equal(requestedPluginId(latest('Show my recent GitHub repositories')), 'github');
  assert.equal(requestedPluginId(latest('Review my Vercel deployment status')), 'vercel');
  assert.equal(requestedPluginId(latest('How do I connect Gmail?')), '');
  assert.equal(requestedPluginId(latest('Can you fix my FiveM server?')), '');
  assert.equal(requestedPluginId([{role:'assistant',content:'Show my Gmail inbox'}]), '');
});

test('Gmail inspection fetches bounded read-only message metadata, not message bodies', async () => {
  const originalFetch=globalThis.fetch;
  const oldId=process.env.GMAIL_CLIENT_ID;
  const oldSecret=process.env.GMAIL_CLIENT_SECRET;
  process.env.GMAIL_CLIENT_ID='mock-id';
  process.env.GMAIL_CLIENT_SECRET='mock-secret';
  const calls=[];
  globalThis.fetch=async (url,opts={})=>{
    calls.push({url:String(url),method:opts.method||'GET'});
    if(String(url).includes('oauth2.googleapis.com/token'))return {ok:true,json:async()=>({access_token:'mock-access-token'})};
    if(String(url).includes('/messages?'))return {ok:true,json:async()=>({messages:[{id:'abc123ff'},{id:'def456ff'}]})};
    if(String(url).includes('/messages/abc123ff'))return {ok:true,json:async()=>({payload:{headers:[{name:'Subject',value:'Your order'},{name:'From',value:'shop@example.com'}]},body:{data:'SECRET MESSAGE BODY'}})};
    if(String(url).includes('/messages/def456ff'))return {ok:true,json:async()=>({payload:{headers:[{name:'Subject',value:'Meeting reminder'},{name:'From',value:'team@example.com'}]}})};
    throw new Error('Unexpected fetch '+url);
  };
  try{
    const data=await inspectProvider('gmail','mock-refresh-token');
    assert.equal(data.items.length,2);
    assert.equal(data.items[0].name,'Your order');
    assert.match(data.items[0].detail,/shop@example.com/);
    assert.doesNotMatch(JSON.stringify(data),/SECRET MESSAGE BODY|mock-access-token|mock-refresh-token/);
    assert.equal(calls.length,4);
    assert.ok(calls.filter(call=>call.url.includes('/messages/')).every(call=>call.url.includes('format=metadata')));
    assert.equal(calls.filter(call=>call.method!=='GET').length,1);
  }finally{
    globalThis.fetch=originalFetch;
    if(oldId===undefined)delete process.env.GMAIL_CLIENT_ID;else process.env.GMAIL_CLIENT_ID=oldId;
    if(oldSecret===undefined)delete process.env.GMAIL_CLIENT_SECRET;else process.env.GMAIL_CLIENT_SECRET=oldSecret;
  }
});

test('chat server and app hub expose read-only connected app workflows', async () => {
  const chat=await readFile(new URL('../api/chat.js',import.meta.url),'utf8');
  const page=await readFile(new URL('../plugins.html',import.meta.url),'utf8');
  const manager=await readFile(new URL('../lib/plugin-manager-handler.js',import.meta.url),'utf8');
  assert.match(chat,/connectedAppChatContext\(session\?\.email, cleanMessages\)/);
  assert.match(page,/const appPrompts=/);
  assert.match(page,/Use in chat/);
  assert.match(page,/renderAppData\(id,data\)/);
  assert.match(page,/directoryGrid\.addEventListener\('click'/);
  assert.match(page,/plugin\.enabled&&plugin\.route&&!plugin\.connection/);
  assert.match(manager,/if\(!plugin\|\|!canUsePlugin\(plugin,\{isOwner\}\)\)/);
  assert.match(manager,/if\(!\(await setEnabledState\(session\.email,id\)\)\)/);
});
