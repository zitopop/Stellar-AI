// Secure owner-only bridge between Stellar AI and the Stellar Roblox Studio plugin.
import crypto from 'crypto';
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { isPluginEnabled } from './plugin-registry.js';

const KV_URL=process.env.KV_REST_API_URL;
const KV_TOKEN=process.env.KV_REST_API_TOKEN;
const PAIR_TTL_SECONDS=600;
const DEVICE_TTL_SECONDS=60*60*24*90;
const TASK_TTL_SECONDS=60*60*24;
const SAFE_TYPES=new Set(['inspect_tree','read_script']);
const WRITE_TYPES=new Set(['ensure_folder','ensure_remote_event','ensure_remote_function','upsert_script','create_map_pack']);
const ALL_TYPES=new Set([...SAFE_TYPES,...WRITE_TYPES]);
const ROOTS=new Set(['Workspace','ReplicatedStorage','ServerScriptService','ServerStorage','StarterGui','StarterPlayer','StarterPack','Lighting']);
const SCRIPT_CLASSES=new Set(['Script','LocalScript','ModuleScript']);
const MAP_MATERIALS=new Set(['SmoothPlastic','Plastic','Grass','Concrete','Asphalt','Wood','WoodPlanks','Metal','DiamondPlate','Neon','Glass','Slate','Sand','Rock','Brick','Cobblestone','Ice','Fabric']);
const PART_SHAPES=new Set(['Block','Ball','Cylinder']);
function clampNumber(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}

function setCors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin',allowed?origin:'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Stellar-Studio-Id, X-Stellar-Studio-Token');
  res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
}
async function redis(command,...args){
  if(!KV_URL||!KV_TOKEN)throw new Error('Roblox Studio bridge storage is not configured.');
  const p=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const r=await fetch(`${KV_URL}/${p}`,{headers:{Authorization:`Bearer ${KV_TOKEN}`},signal:AbortSignal.timeout(8000)});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||`Storage command ${command} failed.`);return d?.result;
}
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
function equalHex(a,b){try{const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}catch{return false}}
function owner(req,res){const s=requireSession(req,res);if(!s)return null;if(!isOwnerEmail(s.email)){res.status(403).json({error:'Owner access is required.'});return null}return s}
async function audit(email,event,detail={}){
  try{
    const record={id:crypto.randomUUID(),at:Date.now(),event,...detail};
    await redis('lpush',`stellar:studio:audit:${email}`,JSON.stringify(record));
    await redis('ltrim',`stellar:studio:audit:${email}`,'0','199');
    await redis('expire',`stellar:studio:audit:${email}`,DEVICE_TTL_SECONDS);
  }catch{}
}
async function stopped(email){return String(await redis('get',`stellar:studio:stop:${email}`)||'')==='1'}
async function studioAuth(req,res){
  const id=String(req.headers['x-stellar-studio-id']||'').trim(),token=String(req.headers['x-stellar-studio-token']||'').trim();
  if(!id||!token){res.status(401).json({code:'studio_credentials_missing',error:'Studio credentials are required.'});return null}
  const raw=await redis('get',`stellar:studio:device:${id}`);if(!raw){res.status(401).json({code:'studio_pairing_invalid',error:'This Studio pairing is no longer valid. Create a fresh pairing code in Stellar, then pair again from Roblox Studio.'});return null}
  let d;try{d=JSON.parse(raw)}catch{d=null}
  if(!d||!equalHex(d.tokenHash,hash(token))){res.status(401).json({code:'studio_credentials_invalid',error:'Invalid Studio credentials. Disconnect and pair Roblox Studio again.'});return null}
  return {id,device:d};
}
async function touch(id,d){const n={...d,lastSeen:Date.now()};await redis('set',`stellar:studio:device:${id}`,JSON.stringify(n));await redis('expire',`stellar:studio:device:${id}`,DEVICE_TTL_SECONDS);return n}
function validPath(value,{allowGame=false}={}){
  const path=String(value||'').trim().replace(/\\/g,'/');
  if(allowGame&&path==='game')return path;
  const parts=path.split('/').filter(Boolean);
  if(!parts.length||!ROOTS.has(parts[0]))throw new Error('Roblox path must start with an allowed service.');
  if(parts.length>16)throw new Error('Roblox path is too deep.');
  for(const part of parts){
    if(part.length>80||part==='.'||part==='..'||/[\u0000-\u001f]/.test(part))throw new Error('Roblox path contains an invalid segment.');
  }
  return parts.join('/');
}
function cleanVector(input,fallback={x:0,y:0,z:0},min=-10000,max=10000){
  const source=input&&typeof input==='object'?input:{};
  const get=(key,index,fb)=>clampNumber(source[key]??source[key.toUpperCase()]??source[index],fb,min,max);
  return {x:get('x',0,fallback.x),y:get('y',1,fallback.y),z:get('z',2,fallback.z)};
}
function cleanColor(input,fallback={r:45,g:135,b:255}){
  const source=input&&typeof input==='object'?input:{};
  const get=(key,index,fb)=>Math.round(clampNumber(source[key]??source[key.toUpperCase()]??source[index],fb,0,255));
  return {r:get('r',0,fallback.r),g:get('g',1,fallback.g),b:get('b',2,fallback.b)};
}
function cleanName(value,fallback){return String(value||fallback||'StellarPart').replace(/[^a-z0-9 _.-]/gi,'').slice(0,64)||fallback}
function cleanMaterial(value){const m=String(value||'SmoothPlastic');return MAP_MATERIALS.has(m)?m:'SmoothPlastic'}
function cleanShape(value){const s=String(value||'Block');return PART_SHAPES.has(s)?s:'Block'}
function cleanMapItem(item,index,spawn=false){
  const x=item&&typeof item==='object'&&!Array.isArray(item)?item:{};
  return {className:spawn?'SpawnLocation':'Part',name:cleanName(x.name,spawn?('Spawn'+(index+1)):('Part'+(index+1))),position:cleanVector(x.position,{x:index*8,y:4,z:0}),size:cleanVector(x.size,spawn?{x:8,y:1,z:8}:{x:8,y:2,z:8},1,1200),color:cleanColor(x.color,spawn?{r:60,g:210,b:140}:{r:45,g:135,b:255}),material:cleanMaterial(x.material),shape:cleanShape(x.shape),anchored:x.anchored!==false,canCollide:x.canCollide!==false,transparency:clampNumber(x.transparency,0,0,.95)};
}
function cleanTask(input){
  const type=String(input?.type||'').trim();if(!ALL_TYPES.has(type))throw new Error('Unsupported Roblox Studio action.');
  const args=input?.args&&typeof input.args==='object'&&!Array.isArray(input.args)?input.args:{};
  if(type==='inspect_tree'){
    args.path=validPath(args.path||'game',{allowGame:true});
    const depth=Number(args.depth);args.depth=Number.isFinite(depth)?Math.max(1,Math.min(6,Math.floor(depth))):3;
  }else if(type==='create_map_pack'){
    args.rootPath=validPath(args.rootPath||'Workspace/StellarGeneratedMap');
    if(!args.rootPath.startsWith('Workspace/'))throw new Error('Map packs must be created under Workspace.');
    args.theme=String(args.theme||'Stellar Roblox map').slice(0,120);
    args.clearExisting=args.clearExisting===true;
    args.parts=(Array.isArray(args.parts)?args.parts:[]).slice(0,120).map((x,i)=>cleanMapItem(x,i,false));
    args.spawnPoints=(Array.isArray(args.spawnPoints)?args.spawnPoints:[]).slice(0,16).map((x,i)=>cleanMapItem(x,i,true));
    const lighting=args.lighting&&typeof args.lighting==='object'&&!Array.isArray(args.lighting)?args.lighting:{};
    args.lighting={clockTime:clampNumber(lighting.clockTime,14,0,24),brightness:clampNumber(lighting.brightness,2,0,10),fogEnd:clampNumber(lighting.fogEnd,100000,50,100000)};
    if(!args.parts.length&&!args.spawnPoints.length)throw new Error('Map pack must include at least one part or spawn point.');
  }else{
    args.path=validPath(args.path);
  }
  if(type==='upsert_script'){
    const className=String(args.className||'Script');if(!SCRIPT_CLASSES.has(className))throw new Error('Unsupported Roblox script class.');
    const source=String(args.source||'');if(!source.trim())throw new Error('Script source is required.');if(source.length>250000)throw new Error('Script source is too large.');
    args.className=className;args.source=source;
  }
  const approved=SAFE_TYPES.has(type)||input?.approved===true;
  if(WRITE_TYPES.has(type)&&!approved)throw new Error('This Roblox Studio change requires explicit approval.');
  return {id:crypto.randomUUID(),type,args,approved,createdAt:Date.now()};
}

export default async function handler(req,res){
  setCors(req,res);if(req.method==='OPTIONS')return res.status(204).end();
  const action=String(req.method==='GET'?req.query?.action:req.body?.action||'').trim();
  try{
    if(action==='claimPair'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const code=String(req.body?.code||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();if(code.length<8)return res.status(400).json({code:'pair_code_short',error:'Enter the full pairing code from Stellar.'});
      const raw=await redis('get',`stellar:studio:pair:${code}`);if(!raw)return res.status(404).json({code:'pair_code_expired',error:'Pairing code expired or was already used. Create a new code in Stellar and paste it into Roblox Studio.'});
      let pair;try{pair=JSON.parse(raw)}catch{pair=null}
      if(!pair||pair.expiresAt<Date.now()||!isOwnerEmail(pair.email))return res.status(400).json({code:'pair_code_invalid',error:'Pairing code is invalid. Create a new code in Stellar and try again.'});
      if(!(await isPluginEnabled(pair.email,'roblox-studio')))return res.status(423).json({code:'roblox_plugin_disabled',error:'Roblox Studio plugin is disabled in Plugins. Enable it in Stellar Plugins, then create a new pairing code.'});
      if(await stopped(pair.email))return res.status(423).json({code:'studio_emergency_stop',error:'Studio Emergency Stop is active. Press Resume in Stellar, then create a new pairing code.'});
      const deviceId=crypto.randomUUID(),deviceToken=crypto.randomBytes(32).toString('base64url');
      const placeId=String(req.body?.placeId||'').slice(0,32),placeName=String(req.body?.placeName||'Roblox Studio').slice(0,100);
      const device={email:pair.email,placeId,placeName,tokenHash:hash(deviceToken),createdAt:Date.now(),lastSeen:Date.now()};
      await redis('set',`stellar:studio:device:${deviceId}`,JSON.stringify(device));await redis('expire',`stellar:studio:device:${deviceId}`,DEVICE_TTL_SECONDS);
      await redis('set',`stellar:studio:owner:${pair.email}`,deviceId);await redis('expire',`stellar:studio:owner:${pair.email}`,DEVICE_TTL_SECONDS);
      await redis('del',`stellar:studio:pair:${code}`);await audit(pair.email,'studio_paired',{deviceId,placeId,placeName});
      return res.status(200).json({ok:true,deviceId,deviceToken});
    }
    if(action==='poll'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const a=await studioAuth(req,res);if(!a)return;await touch(a.id,a.device);
      if(!(await isPluginEnabled(a.device.email,'roblox-studio')))return res.status(200).json({ok:true,stopped:true,disabled:true,task:null});
      if(await stopped(a.device.email))return res.status(200).json({ok:true,stopped:true,task:null});
      const raw=await redis('lpop',`stellar:studio:queue:${a.id}`);if(!raw)return res.status(200).json({ok:true,task:null});
      let task;try{task=JSON.parse(raw)}catch{task=null}if(!task)return res.status(200).json({ok:true,task:null});
      await redis('set',`stellar:studio:task:${task.id}`,JSON.stringify({...task,status:'running',startedAt:Date.now()}));await redis('expire',`stellar:studio:task:${task.id}`,TASK_TTL_SECONDS);
      await audit(a.device.email,'studio_task_started',{taskId:task.id,type:task.type});return res.status(200).json({ok:true,task});
    }
    if(action==='report'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const a=await studioAuth(req,res);if(!a)return;await touch(a.id,a.device);
      const taskId=String(req.body?.taskId||'').trim();if(!/^[0-9a-f-]{36}$/i.test(taskId))return res.status(400).json({error:'Invalid task id.'});
      const result={taskId,ok:req.body?.ok===true,output:String(req.body?.output||'').slice(0,180000),error:String(req.body?.error||'').slice(0,4000),finishedAt:Date.now()};
      const raw=await redis('get',`stellar:studio:task:${taskId}`);let task={id:taskId};try{if(raw)task={...task,...JSON.parse(raw)}}catch{}
      await redis('set',`stellar:studio:task:${taskId}`,JSON.stringify({...task,status:result.ok?'completed':'failed',result}));await redis('expire',`stellar:studio:task:${taskId}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:studio:last:${a.id}`,JSON.stringify(result));await redis('expire',`stellar:studio:last:${a.id}`,TASK_TTL_SECONDS);
      await audit(a.device.email,result.ok?'studio_task_completed':'studio_task_failed',{taskId,type:task.type||'',error:result.ok?'':result.error.slice(0,300)});
      return res.status(200).json({ok:true});
    }

    const session=owner(req,res);if(!session)return;
    const deviceId=String(await redis('get',`stellar:studio:owner:${session.email}`)||'');
    if(action==='createPair'){
      if(!(await isPluginEnabled(session.email,'roblox-studio')))return res.status(423).json({error:'Roblox Studio plugin is disabled in Plugins.'});
      if(await stopped(session.email))return res.status(423).json({error:'Studio Emergency Stop is active.'});
      const code=crypto.randomBytes(6).toString('base64url').replace(/[^A-Z0-9]/gi,'').slice(0,10).toUpperCase().padEnd(10,'X');
      const payload={email:session.email,expiresAt:Date.now()+PAIR_TTL_SECONDS*1000};
      await redis('set',`stellar:studio:pair:${code}`,JSON.stringify(payload),'EX',PAIR_TTL_SECONDS);await audit(session.email,'studio_pair_created');
      return res.status(200).json({ok:true,code,expiresIn:PAIR_TTL_SECONDS});
    }
    if(action==='status'){
      const enabled=await isPluginEnabled(session.email,'roblox-studio');
      const isStopped=await stopped(session.email);
      if(!deviceId)return res.status(200).json({ok:true,paired:false,enabled,online:false,emergencyStopped:isStopped});
      const raw=await redis('get',`stellar:studio:device:${deviceId}`);if(!raw)return res.status(200).json({ok:true,paired:false,online:false,emergencyStopped:isStopped});
      let d;try{d=JSON.parse(raw)}catch{d=null}if(!d)return res.status(200).json({ok:true,paired:false,online:false,emergencyStopped:isStopped});
      return res.status(200).json({ok:true,paired:true,enabled,online:enabled&&!isStopped&&Date.now()-Number(d.lastSeen||0)<90000,deviceId,placeId:d.placeId,placeName:d.placeName,lastSeen:d.lastSeen,emergencyStopped:isStopped});
    }
    if(action==='enqueue'){
      if(!(await isPluginEnabled(session.email,'roblox-studio')))return res.status(423).json({error:'Roblox Studio plugin is disabled in Plugins.'});
      if(!deviceId)return res.status(409).json({error:'Pair Roblox Studio first.'});
      if(await stopped(session.email))return res.status(423).json({error:'Studio Emergency Stop is active.'});
      const task=cleanTask(req.body?.task);
      await redis('rpush',`stellar:studio:queue:${deviceId}`,JSON.stringify(task));await redis('expire',`stellar:studio:queue:${deviceId}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:studio:task:${task.id}`,JSON.stringify({...task,status:'queued'}));await redis('expire',`stellar:studio:task:${task.id}`,TASK_TTL_SECONDS);
      await audit(session.email,'studio_task_queued',{taskId:task.id,type:task.type});return res.status(200).json({ok:true,taskId:task.id,status:'queued'});
    }
    if(action==='taskStatus'){
      const taskId=String(req.query?.taskId||req.body?.taskId||'').trim();if(!taskId)return res.status(400).json({error:'taskId is required.'});
      const raw=await redis('get',`stellar:studio:task:${taskId}`);if(!raw)return res.status(404).json({error:'Task not found.'});
      let task;try{task=JSON.parse(raw)}catch{return res.status(500).json({error:'Task state is invalid.'})}
      return res.status(200).json({ok:true,task});
    }
    if(action==='emergencyStop'){
      await redis('set',`stellar:studio:stop:${session.email}`,'1','EX',DEVICE_TTL_SECONDS);
      if(deviceId)await redis('del',`stellar:studio:queue:${deviceId}`);
      await audit(session.email,'studio_emergency_stop');return res.status(200).json({ok:true});
    }
    if(action==='resume'){
      if(req.body?.confirm!==true)return res.status(400).json({error:'Explicit confirmation is required.'});
      await redis('del',`stellar:studio:stop:${session.email}`);await audit(session.email,'studio_resumed');return res.status(200).json({ok:true});
    }
    if(action==='disconnect'){
      if(deviceId){await redis('del',`stellar:studio:device:${deviceId}`);await redis('del',`stellar:studio:queue:${deviceId}`)}
      await redis('del',`stellar:studio:owner:${session.email}`);await audit(session.email,'studio_disconnected',{deviceId});return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:'Unknown Roblox Studio action.'});
  }catch(error){console.error('Roblox Studio bridge error',error?.message||error);return res.status(500).json({error:error?.message||'Roblox Studio bridge failed.'})}
}
