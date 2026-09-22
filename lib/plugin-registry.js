import crypto from 'crypto';

export const PLUGIN_SCHEMA_VERSION = '1';
export const PLUGIN_REGISTRY = Object.freeze([
  Object.freeze({
    id:'pc-agent',
    name:'PC Agent',
    description:'Inspect and edit files inside a paired Windows workspace, run approved terminal commands, and review Git changes.',
    category:'Coding',
    status:'beta',
    audience:'signed_in',
    defaultEnabled:true,
    route:'/desktop',
    permissions:[
      {id:'files.read',label:'Read project files',risk:'read'},
      {id:'files.write',label:'Write project files',risk:'write'},
      {id:'shell.run',label:'Run approved terminal commands',risk:'high'},
      {id:'browser.open',label:'Open approved web links',risk:'write'},
    ],
  }),
  Object.freeze({
    id:'roblox-studio',
    name:'Roblox Studio',
    description:'Inspect an open place and apply approved scripts, folders, RemoteEvents and RemoteFunctions.',
    category:'Coding',
    status:'beta',
    audience:'owner',
    defaultEnabled:true,
    route:'/roblox-studio',
    permissions:[
      {id:'studio.read',label:'Inspect place hierarchy and scripts',risk:'read'},
      {id:'studio.write',label:'Create or update approved Studio objects',risk:'write'},
    ],
  }),
  Object.freeze({
    id:'github',
    name:'GitHub',
    description:'Connect a GitHub token to inspect your repositories and recent project activity from Stellar.',
    category:'Developer tools',
    status:'available',
    audience:'signed_in',
    defaultEnabled:false,
    connection:'oauth_or_token',
    oauthProvider:'github',
    installLabel:'Install GitHub',
    connectLabel:'Connect GitHub',
    permissions:[
      {id:'repos.read',label:'Read repositories and repository metadata',risk:'read'},
    ],
  }),
  Object.freeze({
    id:'vercel',
    name:'Vercel',
    description:'Connect a Vercel access token to inspect projects and deployment status from Stellar.',
    category:'Developer tools',
    status:'available',
    audience:'signed_in',
    defaultEnabled:false,
    connection:'token',
    installLabel:'Install Vercel',
    connectLabel:'Connect Vercel',
    permissions:[
      {id:'deployments.read',label:'Read projects and deployment metadata',risk:'read'},
    ],
  }),
  Object.freeze({
    id:'gmail',
    name:'Gmail',
    description:'Search mail and prepare replies, with separate permission before sending messages.',
    category:'Productivity',
    status:'coming_soon',
    audience:'signed_in',
    defaultEnabled:false,
    permissions:[
      {id:'mail.read',label:'Read selected email',risk:'read'},
      {id:'mail.draft',label:'Create drafts',risk:'write'},
      {id:'mail.send',label:'Send approved email',risk:'high'},
    ],
  }),
  Object.freeze({
    id:'google-drive',
    name:'Google Drive',
    description:'Read selected project files and documents from Drive.',
    category:'Productivity',
    status:'coming_soon',
    audience:'signed_in',
    defaultEnabled:false,
    permissions:[
      {id:'drive.read',label:'Read selected Drive files',risk:'read'},
      {id:'drive.write',label:'Create approved Drive files',risk:'write'},
    ],
  }),
  Object.freeze({
    id:'google-calendar',
    name:'Google Calendar',
    description:'Check availability and manage approved calendar events.',
    category:'Productivity',
    status:'coming_soon',
    audience:'signed_in',
    defaultEnabled:false,
    permissions:[
      {id:'calendar.read',label:'Read calendar events',risk:'read'},
      {id:'calendar.write',label:'Create or update approved events',risk:'write'},
    ],
  }),
  Object.freeze({
    id:'discord',
    name:'Discord',
    description:'Work with approved servers, channels, messages and bot workflows.',
    category:'Community',
    status:'coming_soon',
    audience:'signed_in',
    defaultEnabled:false,
    permissions:[
      {id:'discord.read',label:'Read approved server content',risk:'read'},
      {id:'discord.write',label:'Send or update approved content',risk:'write'},
    ],
  }),
  Object.freeze({
    id:'shopify',
    name:'Shopify',
    description:'Inspect store content and manage approved catalogue or storefront changes.',
    category:'Business',
    status:'coming_soon',
    audience:'signed_in',
    defaultEnabled:false,
    permissions:[
      {id:'shopify.read',label:'Read store data',risk:'read'},
      {id:'shopify.write',label:'Apply approved store changes',risk:'write'},
    ],
  }),
  Object.freeze({
    id:'stripe',
    name:'Stripe',
    description:'Inspect business payment data and manage explicitly approved billing objects.',
    category:'Business',
    status:'coming_soon',
    audience:'signed_in',
    defaultEnabled:false,
    permissions:[
      {id:'stripe.read',label:'Read business billing data',risk:'read'},
      {id:'stripe.write',label:'Create approved billing objects',risk:'high'},
    ],
  }),
]);

const KV_URL=process.env.KV_REST_API_URL;
const KV_TOKEN=process.env.KV_REST_API_TOKEN;
const PREF_TTL_SECONDS=60*60*24*365;
const byId=new Map(PLUGIN_REGISTRY.map(plugin=>[plugin.id,plugin]));

function accountKey(email){
  return crypto.createHash('sha256').update(String(email||'').trim().toLowerCase()).digest('hex');
}
function prefKey(email){return `stellar:plugins:${accountKey(email)}`;}

async function redis(command,...args){
  if(!KV_URL||!KV_TOKEN)throw new Error('Plugin preference storage is not configured.');
  const p=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const r=await fetch(`${KV_URL}/${p}`,{headers:{Authorization:`Bearer ${KV_TOKEN}`},signal:AbortSignal.timeout(8000)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.error||`Storage command ${command} failed.`);
  return d?.result;
}

export function getPluginDefinition(id){
  return byId.get(String(id||'').trim())||null;
}

export function canUsePlugin(plugin,{isOwner=false}={}){
  if(!plugin)return false;
  if(plugin.status==='coming_soon')return false;
  if(plugin.audience==='owner')return isOwner===true;
  return true;
}

export async function getPluginPreferences(email){
  if(!KV_URL||!KV_TOKEN)return {};
  const raw=await redis('get',prefKey(email));
  if(!raw)return {};
  try{
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
  }catch{return {}}
}

export async function setPluginEnabled(email,id,enabled){
  const plugin=getPluginDefinition(id);
  if(!plugin)throw new Error('Unknown plugin.');
  if(plugin.status==='coming_soon')throw new Error('That plugin is not available yet.');
  const prefs=await getPluginPreferences(email);
  prefs[plugin.id]={enabled:enabled===true,updatedAt:Date.now()};
  await redis('set',prefKey(email),JSON.stringify(prefs));
  await redis('expire',prefKey(email),PREF_TTL_SECONDS);
  return prefs[plugin.id];
}

export async function isPluginEnabled(email,id){
  const plugin=getPluginDefinition(id);
  if(!plugin||plugin.status==='coming_soon')return false;
  const prefs=await getPluginPreferences(email);
  const stored=prefs?.[plugin.id];
  return typeof stored?.enabled==='boolean'?stored.enabled:plugin.defaultEnabled===true;
}

export function publicPluginManifest(plugin,{enabled=false,availableToUser=false}={}){
  return {
    schemaVersion:PLUGIN_SCHEMA_VERSION,
    id:plugin.id,
    name:plugin.name,
    description:plugin.description,
    category:plugin.category,
    status:plugin.status,
    audience:plugin.audience,
    connection:plugin.connection||null,
    oauthProvider:plugin.oauthProvider||null,
    installLabel:plugin.installLabel||'Install',
    connectLabel:plugin.connectLabel||'Connect',
    enabled:enabled===true,
    availableToUser:availableToUser===true,
    route:availableToUser?plugin.route||null:null,
    permissions:plugin.permissions.map(permission=>({...permission})),
  };
}
