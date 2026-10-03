import crypto from 'crypto';
import { isOwnerEmail, requireSession } from './auth.js';
import { deletePluginCredential, hasPluginCredential, pluginCredentialStorageReady, readPluginCredential, storePluginCredential } from './plugin-credentials.js';
import { inspectProvider, verifyProviderToken } from './plugin-providers.js';
import { PLUGIN_REGISTRY, canUsePlugin, getPluginDefinition, getPluginPreferences, publicPluginManifest, setPluginEnabled } from './plugin-registry.js';

const TOKEN_PLUGIN_IDS=new Set(['github','vercel','gmail']);
const LIVE_OAUTH_PLUGIN_IDS=new Set(['github','gmail']);
const OAUTH_PLUGIN_IDS=new Set(PLUGIN_REGISTRY.filter(plugin=>String(plugin.connection||'').includes('oauth')).map(plugin=>plugin.id));
const KV_URL=process.env.KV_REST_API_URL;
const KV_TOKEN=process.env.KV_REST_API_TOKEN;
const OAUTH_STATE_TTL_SECONDS=600;

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
function oauthSetupEnv(id){
  const plugin=getPluginDefinition(String(id||'').trim());
  return Array.isArray(plugin?.setupEnv)?plugin.setupEnv.slice(0,12):[];
}
function oauthConfigured(id){
  const pluginId=String(id||'').trim();
  const setup=oauthSetupEnv(pluginId);
  if(!OAUTH_PLUGIN_IDS.has(pluginId))return false;
  return setup.length>0&&setup.every(name=>Boolean(process.env[name]));
}
function oauthStatus(id){
  const pluginId=String(id||'').trim();
  const plugin=getPluginDefinition(pluginId);
  const supported=OAUTH_PLUGIN_IDS.has(pluginId);
  const setup=oauthSetupEnv(pluginId);
  const missing=supported?setup.filter(name=>!process.env[name]).slice(0,12):[];
  const exchangeImplemented=LIVE_OAUTH_PLUGIN_IDS.has(pluginId);
  return {
    supported,
    provider:plugin?.oauthProvider||null,
    configured:supported&&setup.length>0&&missing.length===0,
    exchangeImplemented,
    liveReady:supported&&exchangeImplemented&&setup.length>0&&missing.length===0&&plugin?.status!=='coming_soon',
    missing,
    setupEnv:setup,
    tokenFallback:tokenPlugin(pluginId),
    pluginStatus:plugin?.status||null,
    callbackPath:'/api/plugin-oauth-callback',
  };
}
function publicOauthStatus(id,{exposeSetup=false,isOwner=false}={}){
  const status=oauthStatus(id);
  return {
    supported:status.supported,
    provider:status.provider,
    liveReady:status.liveReady,
    exchangeImplemented:status.exchangeImplemented,
    tokenFallback:isOwner===true&&status.tokenFallback===true,
    pluginStatus:status.pluginStatus,
    callbackPath:status.callbackPath,
    ...(exposeSetup?{
      configured:status.configured,
      missing:status.missing,
      setupEnv:status.setupEnv,
    }:{})
  };
}
function gmailClientId(){return String(process.env.GMAIL_CLIENT_ID||process.env.GOOGLE_OAUTH_CLIENT_ID||'').trim();}
function gmailClientSecret(){return String(process.env.GMAIL_CLIENT_SECRET||process.env.GOOGLE_OAUTH_CLIENT_SECRET||'').trim();}
async function exchangeGmailCode(code,redirectUri){
  const clientId=gmailClientId();
  if(!clientId)throw new Error('Gmail OAuth client id is not configured.');
  const body=new URLSearchParams({client_id:clientId,code,redirect_uri:redirectUri,grant_type:'authorization_code'});
  const secret=gmailClientSecret();
  if(secret)body.set('client_secret',secret);
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.refresh_token)throw new Error(data?.error_description||data?.error||'Google did not return a refresh token. Reconnect and choose consent.');
  const profile=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile',{headers:{Authorization:'Bearer '+data.access_token},signal:AbortSignal.timeout(12000)}).then(r=>r.json()).catch(()=>({}));
  return {refreshToken:String(data.refresh_token),label:String(profile?.emailAddress||'Gmail account')};
}
function publicOrigin(req){
  const origin=String(req.headers.origin||'');
    if(/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin))return origin;
    if(/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin))return origin;
  return process.env.PUBLIC_APP_URL||'https://trystellarai.com';
}
async function redis(command,...args){
  if(!KV_URL||!KV_TOKEN)throw new Error('Plugin OAuth storage is not configured.');
  const p=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const r=await fetch(KV_URL+'/'+p,{headers:{Authorization:'Bearer '+KV_TOKEN},signal:AbortSignal.timeout(8000)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.error||('Storage command '+command+' failed.'));
  return d?.result;
}
function pluginHtml(res,title,message,kind='ok'){
  const safe=String(message||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  res.setHeader('content-type','text/html; charset=utf-8');
  return res.status(kind==='ok'?200:400).end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#090c13;color:#f4f6fb;font:15px system-ui}.card{width:min(440px,calc(100% - 28px));border:1px solid rgba(255,255,255,.1);border-radius:18px;background:#111722;padding:22px}.btn{display:inline-flex;margin-top:14px;min-height:42px;align-items:center;padding:0 14px;border-radius:10px;background:#7b6cff;color:#fff;text-decoration:none;font-weight:800}.muted{color:#9ca5b5}</style><div class="card"><h1>'+title+'</h1><p class="muted">'+safe+'</p><a class="btn" href="/plugins">Back to plugins</a><script>setTimeout(function(){location.href="/plugins"},1600)</script></div>');
}
async function pluginOAuthCallback(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'GET required.'});
  const code=String(req.query?.code||'').trim();
  const state=String(req.query?.state||'').trim();
  if(!code||!state)return pluginHtml(res,'Plugin connection failed','Missing OAuth code or state.','bad');
  const raw=await redis('get','stellar:plugin:oauth:'+state);
  if(!raw)return pluginHtml(res,'Plugin connection expired','Create a new connection from the Plugins page.','bad');
  await redis('del','stellar:plugin:oauth:'+state);
  let payload;try{payload=JSON.parse(raw)}catch{payload=null}
  if(!payload||!LIVE_OAUTH_PLUGIN_IDS.has(payload.id)||payload.expiresAt<Date.now())return pluginHtml(res,'Plugin connection expired','Create a new connection from the Plugins page.','bad');
  const redirectUri=(process.env.PUBLIC_APP_URL||publicOrigin(req))+'/api/plugin-oauth-callback';
  if(payload.id==='gmail'){
    try{
      const result=await exchangeGmailCode(code,redirectUri);
      await storePluginCredential(payload.email,'gmail',result.refreshToken);
      await setPluginEnabled(payload.email,'gmail',true);
      return pluginHtml(res,'Gmail connected','Connected '+result.label+' to Stellar AI inbox alerts.','ok');
    }catch(error){
      return pluginHtml(res,'Gmail connection failed',error?.message||'Google did not complete the connection.','bad');
    }
  }
  const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','content-type':'application/json'},body:JSON.stringify({client_id:process.env.GITHUB_OAUTH_CLIENT_ID,client_secret:process.env.GITHUB_OAUTH_CLIENT_SECRET,code,redirect_uri:redirectUri}),signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token)return pluginHtml(res,'GitHub connection failed',data.error_description||data.error||'GitHub did not return an access token.','bad');
  const verified=await verifyProviderToken('github',data.access_token);
  await storePluginCredential(payload.email,'github',data.access_token);
  await setPluginEnabled(payload.email,'github',true);
  return pluginHtml(res,'GitHub connected','Connected '+(verified.account?.label||'GitHub')+' to Stellar AI.','ok');
}

async function connectedMap(email){
  const pairs=await Promise.all([...TOKEN_PLUGIN_IDS].map(async id=>[id,await hasPluginCredential(email,id)]));
  return Object.fromEntries(pairs);
}

export default async function pluginManagerHandler(req,res){
  setCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
  const action=String(req.method==='GET'?req.query?.action:req.body?.action||'list').trim()||'list';
  if(action==='oauthCallback')return pluginOAuthCallback(req,res);
  const session=sessionOr401(req,res);if(!session)return;
  const isOwner=isOwnerEmail(session.email);

  try{
    if(action==='list'){
      const [prefs,connections]=await Promise.all([
        getPluginPreferences(session.email),
        pluginCredentialStorageReady()?connectedMap(session.email):Promise.resolve({}),
      ]);
      const exposeSetup=isOwner===true;
      const visibleRegistry=PLUGIN_REGISTRY.filter(plugin=>{
        if(isOwner)return true;
        if(plugin.audience==='owner'||plugin.status==='coming_soon')return false;
        if(tokenPlugin(plugin.id)&&!connections[plugin.id]&&OAUTH_PLUGIN_IDS.has(plugin.id)&&!oauthStatus(plugin.id).liveReady)return false;
        return true;
      });
      const plugins=visibleRegistry.map(plugin=>{
        const availableToUser=canUsePlugin(plugin,{isOwner});
        const connected=tokenPlugin(plugin.id)?Boolean(connections[plugin.id]):false;
        const stored=prefs?.[plugin.id];
        const enabled=availableToUser
          ? (typeof stored?.enabled==='boolean'?stored.enabled:plugin.defaultEnabled===true)
          : false;
        const safeOauthStatus=OAUTH_PLUGIN_IDS.has(plugin.id)
          ? publicOauthStatus(plugin.id,{exposeSetup,isOwner})
          : null;
        return {
          ...publicPluginManifest(plugin,{enabled:tokenPlugin(plugin.id)?enabled&&connected:enabled,availableToUser,exposeSetup}),
          connected,
          credentialStorageReady:tokenPlugin(plugin.id)?pluginCredentialStorageReady():true,
          inspectable:tokenPlugin(plugin.id)&&connected,
          oauthAvailable:availableToUser&&Boolean(safeOauthStatus?.liveReady),
          oauthStatus:safeOauthStatus,
          installable:availableToUser&&plugin.status!=='coming_soon'&&(!tokenPlugin(plugin.id)||connected||Boolean(safeOauthStatus?.liveReady)||isOwner),
          oauthSetupMissing:exposeSetup&&OAUTH_PLUGIN_IDS.has(plugin.id)&&oauthStatus(plugin.id).missing.length>0,
          oauthSetupMissingEnv:exposeSetup&&OAUTH_PLUGIN_IDS.has(plugin.id)?oauthStatus(plugin.id).missing.slice(0,8):[],
        };
      });
      return res.status(200).json({ok:true,viewer:{signedIn:true,owner:isOwner===true},plugins});
    }

    if(action==='providerStatus'){
      const id=String(req.method==='GET'?req.query?.id:req.body?.id||'').trim();
      const plugin=getPluginDefinition(id);
      if(!plugin)return res.status(404).json({error:'Plugin not found.'});
      if(!canUsePlugin(plugin,{isOwner}))return res.status(403).json({error:'That plugin is not available for this account.'});
      const status=oauthStatus(id);
      return res.status(200).json({
        ok:true,
        id,
        oauthStatus:publicOauthStatus(id,{exposeSetup:isOwner===true,isOwner}),
        oauthAvailable:status.liveReady,
        tokenFallback:isOwner===true&&status.tokenFallback===true,
        callbackUrl:publicOrigin(req)+status.callbackPath,
      });
    }


    if(action==='install'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const id=String(req.body?.id||'').trim();
      const plugin=getPluginDefinition(id);
      if(!plugin)return res.status(404).json({error:'Plugin not found.'});
      if(!canUsePlugin(plugin,{isOwner}))return res.status(plugin.status==='coming_soon'?409:403).json({error:plugin.status==='coming_soon'?'That plugin is coming soon.':'That plugin is not available for this account.'});
      if(tokenPlugin(id)&&!(await hasPluginCredential(session.email,id))){
        const status=oauthStatus(id);
        return res.status(200).json({
          ok:true,
          needsConnection:true,
          oauthAvailable:status.liveReady,
          oauthStatus:publicOauthStatus(id,{exposeSetup:isOwner===true,isOwner}),
          tokenFallback:isOwner===true&&status.tokenFallback===true,
          plugin:publicPluginManifest(plugin,{enabled:false,availableToUser:true,exposeSetup:isOwner===true}),
        });
      }
      const pref=await setPluginEnabled(session.email,id,true);
      return res.status(200).json({ok:true,needsConnection:false,plugin:{...publicPluginManifest(plugin,{enabled:pref.enabled,availableToUser:true}),connected:tokenPlugin(id)?await hasPluginCredential(session.email,id):false,credentialStorageReady:tokenPlugin(id)?pluginCredentialStorageReady():true,inspectable:tokenPlugin(id)&&pref.enabled}});
    }

    if(action==='startOAuth'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const id=String(req.body?.id||'').trim();
      const plugin=getPluginDefinition(id);
      if(!plugin||!OAUTH_PLUGIN_IDS.has(id))return res.status(404).json({error:'OAuth is not supported for that plugin yet.'});
      if(!canUsePlugin(plugin,{isOwner}))return res.status(403).json({error:'That plugin is not available for this account.'});
      const status=oauthStatus(id);
      const safeStatus=publicOauthStatus(id,{exposeSetup:isOwner===true,isOwner});
      const safeFallback=isOwner===true&&status.tokenFallback===true;
      if(plugin.status==='coming_soon')return res.status(409).json({error:plugin.name+' is not available yet.',oauthStatus:safeStatus,tokenFallback:safeFallback});
      if(!status.configured)return res.status(501).json({error:isOwner?'OAuth needs provider credentials added before it can go live.':'This connection is not available yet.',oauthStatus:safeStatus,tokenFallback:safeFallback});
      if(!status.exchangeImplemented)return res.status(501).json({error:isOwner?'OAuth for '+plugin.name+' still needs its secure token exchange.':'This connection is not available yet.',oauthStatus:safeStatus,tokenFallback:safeFallback});
      const state=crypto.randomBytes(24).toString('base64url');
      const redirectUri=publicOrigin(req)+'/api/plugin-oauth-callback';
      await redis('set','stellar:plugin:oauth:'+state,JSON.stringify({email:session.email,id,expiresAt:Date.now()+OAUTH_STATE_TTL_SECONDS*1000}),'EX',OAUTH_STATE_TTL_SECONDS);
      const url=id==='gmail'?new URL('https://accounts.google.com/o/oauth2/v2/auth'):new URL('https://github.com/login/oauth/authorize');
      if(id==='gmail'){
        url.searchParams.set('client_id',gmailClientId());
        url.searchParams.set('redirect_uri',redirectUri);
        url.searchParams.set('response_type','code');
        url.searchParams.set('scope','https://www.googleapis.com/auth/gmail.readonly');
        url.searchParams.set('access_type','offline');
        url.searchParams.set('prompt','consent');
        url.searchParams.set('include_granted_scopes','true');
        url.searchParams.set('state',state);
      }else{
        url.searchParams.set('client_id',process.env.GITHUB_OAUTH_CLIENT_ID);
        url.searchParams.set('redirect_uri',redirectUri);
        url.searchParams.set('state',state);
        url.searchParams.set('scope','read:user');
      }
      return res.status(200).json({ok:true,url:url.toString(),expiresIn:OAUTH_STATE_TTL_SECONDS});
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

