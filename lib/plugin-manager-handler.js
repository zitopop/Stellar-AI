import { isOwnerEmail, requireSession } from './auth.js';
import { PLUGIN_REGISTRY, canUsePlugin, getPluginDefinition, getPluginPreferences, publicPluginManifest, setPluginEnabled } from './plugin-registry.js';

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

export default async function pluginManagerHandler(req,res){
  setCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
  const session=sessionOr401(req,res);if(!session)return;
  const isOwner=isOwnerEmail(session.email);
  const action=String(req.method==='GET'?req.query?.action:req.body?.action||'list').trim()||'list';

  try{
    if(action==='list'){
      const prefs=await getPluginPreferences(session.email);
      const plugins=PLUGIN_REGISTRY.map(plugin=>{
        const availableToUser=canUsePlugin(plugin,{isOwner});
        const stored=prefs?.[plugin.id];
        const enabled=availableToUser
          ? (typeof stored?.enabled==='boolean'?stored.enabled:plugin.defaultEnabled===true)
          : false;
        return publicPluginManifest(plugin,{enabled,availableToUser});
      });
      return res.status(200).json({ok:true,plugins});
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
      const pref=await setPluginEnabled(session.email,id,req.body.enabled);
      return res.status(200).json({ok:true,plugin:publicPluginManifest(plugin,{enabled:pref.enabled,availableToUser:true})});
    }

    return res.status(400).json({error:'Unknown plugin action.'});
  }catch(error){
    console.error('Plugin manager failed',error?.message||error);
    return res.status(503).json({error:'Plugin settings are temporarily unavailable. Please try again shortly.'});
  }
}
