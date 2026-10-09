import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import manager from '../lib/plugin-manager-handler.js';
import { getPluginDefinition } from '../lib/plugin-registry.js';

function request(action='publicCatalog',method='GET'){
  const result={status:200,body:null,headers:{}};
  const req={
    method,
    headers:{origin:'https://trystellarai.com'},
    query:{action},
    body:{action},
  };
  const res={
    setHeader(name,value){result.headers[name]=value;return this;},
    status(code){result.status=code;return this;},
    json(value){result.body=value;return this;},
    end(){return this;},
  };
  return manager(req,res).then(()=>result);
}

test('public plugin catalogue can be read without a session but never exposes private integrations',async()=>{
  const {status,body,headers}=await request();
  assert.equal(status,200);
  assert.equal(headers['Cache-Control'],'no-store');
  assert.equal(body.viewer.signedIn,false);
  const ids=body.plugins.map(plugin=>plugin.id);
  assert.ok(ids.includes('gmail'));
  assert.ok(ids.includes('pc-agent'));
  assert.ok(ids.includes('google-drive'));
  for(const restricted of ['github','vercel','roblox-studio']){
    assert.equal(ids.includes(restricted),false,restricted+' must not appear publicly');
  }
  for(const plugin of body.plugins){
    assert.equal(plugin.connected,false);
    assert.equal(plugin.enabled,false);
    assert.equal(plugin.oauthAvailable,false);
    assert.equal(plugin.installable,false);
    assert.deepEqual(plugin.setupEnv,[]);
    assert.equal(plugin.setupStatus,null);
    assert.equal(plugin.route,null);
    assert.equal(plugin.availableToUser,false);
    assert.equal(plugin.audience,'signed_in');
    assert.equal(Object.hasOwn(plugin,'credentialStorageReady'),false);
  }
});

test('the catalogue is only a public read; privileged manager actions still require sign-in',async()=>{
  for(const [action,method] of [['list','GET'],['publicCatalog','POST'],['setEnabled','POST']]){
    const {status}=await request(action,method);
    assert.equal(status,401,action+' should not bypass authentication');
  }
});

test('Gmail is accurately documented as read-only until approved write endpoints exist',()=>{
  const gmail=getPluginDefinition('gmail');
  assert.deepEqual(gmail.permissions.map(permission=>permission.id),['mail.read']);
  assert.match(gmail.description,/Sending and drafting are not enabled/);
  assert.ok(gmail.skills.every(skill=>!/send|draft/i.test(skill)));
});

test('the plugin page includes usable signed-out discovery, filters and reversible controls',async()=>{
  const html=await readFile(new URL('../plugins.html',import.meta.url),'utf8');
  assert.match(html,/\/api\/plugins\?action=publicCatalog/);
  for(const name of ['all','connected','supported','planned'])assert.match(html,new RegExp('data-directory-filter="'+name+'"'));
  assert.match(html,/aria-pressed/);
  assert.match(html,/id="directory-empty"/);
  assert.match(html,/pluginApi\('setEnabled',\{id,enabled:action==='resume'\}\)/);
  assert.match(html,/window\.confirm\('Disconnect this app/);
  assert.match(html,/plugin\.oauthStatus\?\.tokenFallback/);
});
