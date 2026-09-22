import { isOwnerEmail, requireSession } from './auth.js';
import { deletePluginCredential, hasPluginCredential, pluginCredentialStorageReady, readPluginCredential, storePluginCredential } from './plugin-credentials.js';
import { inspectProvider, verifyProviderToken } from './plugin-providers.js';
import { PLUGIN_REGISTRY, canUsePlugin, getPluginDefinition, getPluginPreferences, publicPluginManifest, setPluginEnabled } from './plugin-registry.js';

const TOKEN_PLUGIN_IDS=new Set(['github','vercel']);

function setCors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin',allowed?origin:'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Vary','Origin');
  res.setHeader('Cache-Control','no-store');
}
function sessionOr401(req,res){
  const session=requireSession(req,res);
  return session||null;
}
function tokenPlugin(id){return TOKEN_PLUGIN_IDS.has(String(id||'').trim())}
async function connectedMap(email){
  const pairs=await Promise.all([...TOKEN_PLUGIN_IDS].map(async id=>[id,await hasPluginCredential(email,id)]));
  return Object.fromEntries(pairs);
}

export default async function pluginManagerHandler(req,res){
  setCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
  const session=sessionOr401(req,res);if(!session)return;
  const isOwner=isOwnerEmail(session.email);
  const action=String(req.method==='GET'?req.query?.action:req.body?.action||'list').trim()||'list';

  try{
    if(action==='list'){
      const [prefs,connections]=await Promise.all([
        getPluginPreferences(session.email),
        pluginCredentialStorageReady()?connectedMap(session.email):Promise.resolve({}),
      ]);
      const plugins=PLUGIN_REGISTRY.map(plugin=>{
        const availableToUser=canUsePlugin(plugin,{isOwner});
        const connected=tokenPlugin(plugin.id)?Boolean(connections[plugin.id]):false;
        const stored=prefs?.[plugin.id];
        const enabled=availableToUser
          ? (typeof stored?.enabled==='boolean'?stored.enabled:plugin.defaultEnabled===true)
          : false;
        return {
          ...publicPluginManifest(plugin,{enabled:tokenPlugin(plugin.id)?enabled&&connected:enabled,availableToUser}),
          connected,
          credentialStorageReady:tokenPlugin(plugin.id)?pluginCredentialStorageReady():true,
          inspectable:tokenPlugin(plugin.id)&&connected,
        };
      });
      return res.status(200).json({ok:true,plugins});
    }

    if(action==='connectToken'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const id=String(req.body?.id||'').trim();
      const plugin=getPluginDefinition(id);
      if(!plugin||!tokenPlugin(id))return res.status(404).json({error:'Token connection is not supported for that plugin.'});
      if(!canUsePlugin(plugin,{isOwner}))return res.status(403).json({error:'That plugin is not available for this account.'});
      if(!pluginCredentialStorageReady())return res.status(503).json({error:'Secure plugin credential storage is not configured.'});
      const token=String(req.body?.token||'').trim();
      if(!token)return res.status(400).json({error:'Enter a token to connect this plugin.'});
      const verified=await verifyProviderToken(id,token);
      await storePluginCredential(session.email,id,token);
      const pref=await setPluginEnabled(session.email,id,true);
      return res.status(200).json({
        ok:true,
        account:verified.account,
        scopes:verified.scopes,
        plugin:{
          ...publicPluginManifest(plugin,{enabled:pref.enabled,availableToUser:true}),
          connected:true,
          credentialStorageReady:true,
          inspectable:true,
        },
      });
    }

    if(action==='disconnect'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const id=String(req.body?.id||'').trim();
      if(!tokenPlugin(id))return res.status(400).json({error:'That plugin does not use a stored token connection.'});
      await deletePluginCredential(session.email,id);
      await setPluginEnabled(session.email,id,false);
      const plugin=getPluginDefinition(id);
      return res.status(200).json({
        ok:true,
        plugin:{
          ...publicPluginManifest(plugin,{enabled:false,availableToUser:canUsePlugin(plugin,{isOwner})}),
          connected:false,
          credentialStorageReady:pluginCredentialStorageReady(),
          inspectable:false,
        },
      });
    }

    if(action==='inspect'){
      const id=String(req.method==='GET'?req.query?.id:req.body?.id||'').trim();
      if(!tokenPlugin(id))return res.status(400).json({error:'That plugin does not support inspection yet.'});
      const plugin=getPluginDefinition(id);
      if(!plugin||!canUsePlugin(plugin,{isOwner}))return res.status(403).json({error:'That plugin is not available for this account.'});
      const token=await readPluginCredential(session.email,id);
      if(!token)return res.status(409).json({error:'Connect this plugin first.'});
      if(!(await setEnabledState(session.email,id)))return res.status(423).json({error:'Enable this plugin before using it.'});
      const result=await inspectProvider(id,token);
      return res.status(200).json({ok:true,...result});
    }

    if(action==='setEnabled'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const id=String(req.body?.id||'').trim();
      const plugin=getPluginDefinition(id);
      if(!plugin)return res.status(404).json({error:'Plugin not found.'});
      if(!canUsePlugin(plugin,{isOwner})){
        return res.status(plugin.status==='coming_soon'?409:403).json({
          error:plugin.status==='coming_soon'?'That plugin is coming soon.':'That plugin is not available for this account.',
        });
      }
      if(typeof req.body?.enabled!=='boolean')return res.status(400).json({error:'enabled must be true or false.'});
      if(tokenPlugin(id)&&req.body.enabled===true&&!(await hasPluginCredential(session.email,id))){
        return res.status(409).json({error:'Connect this plugin before enabling it.'});
      }
      const pref=await setPluginEnabled(session.email,id,req.body.enabled);
      return res.status(200).json({
        ok:true,
        plugin:{
          ...publicPluginManifest(plugin,{enabled:pref.enabled,availableToUser:true}),
          connected:tokenPlugin(id)?await hasPluginCredential(session.email,id):false,
          credentialStorageReady:tokenPlugin(id)?pluginCredentialStorageReady():true,
          inspectable:tokenPlugin(id)&&pref.enabled,
        },
      });
    }

    return res.status(400).json({error:'Unknown plugin action.'});
  }catch(error){
    console.error('Plugin manager failed',error?.message||error);
    const message=String(error?.message||'');
    if(/rejected this token|Bad credentials|invalid token|unauthorized/i.test(message)){
      return res.status(401).json({error:'That token could not be verified. Check it and try again.'});
    }
    return res.status(503).json({error:message||'Plugin settings are temporarily unavailable. Please try again shortly.'});
  }
}

async function setEnabledState(email,id){
  const prefs=await getPluginPreferences(email);
  const plugin=getPluginDefinition(id);
  const stored=prefs?.[id];
  return typeof stored?.enabled==='boolean'?stored.enabled:plugin?.defaultEnabled===true;
}
