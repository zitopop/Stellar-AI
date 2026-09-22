// api/desktop-agent.js — owner-only bridge between Stellar web and a paired local Windows companion.
import crypto from 'crypto';
import { isOwnerEmail, requireSession } from '../lib/auth.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const PAIR_TTL_SECONDS = 600;
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 90;
const TASK_TTL_SECONDS = 60 * 60 * 24;
const SAFE_TYPES = new Set(['read_file','list_directory']);
const APPROVAL_TYPES = new Set(['write_file','mkdir','run_command','open_url']);
const ALL_TYPES = new Set([...SAFE_TYPES, ...APPROVAL_TYPES]);

function setCors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin',allowed?origin:'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Stellar-Device-Id, X-Stellar-Device-Token');
  res.setHeader('Vary','Origin');
  res.setHeader('Cache-Control','no-store');
}

async function redis(command,...args){
  if(!KV_URL||!KV_TOKEN) throw new Error('Desktop agent storage is not configured.');
  const path=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const response=await fetch(`${KV_URL}/${path}`,{headers:{Authorization:`Bearer ${KV_TOKEN}`},signal:AbortSignal.timeout(8000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.error||`Storage command ${command} failed.`);
  return data?.result;
}
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
function equalHex(a,b){
  try{const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}catch{return false}
}
function owner(req,res){
  const session=requireSession(req,res);
  if(!session) return null;
  if(!isOwnerEmail(session.email)){res.status(403).json({error:'Owner access is required.'});return null}
  return session;
}
async function deviceAuth(req,res){
  const id=String(req.headers['x-stellar-device-id']||'').trim();
  const token=String(req.headers['x-stellar-device-token']||'').trim();
  if(!id||!token){res.status(401).json({error:'Device credentials are required.'});return null}
  const raw=await redis('get',`stellar:desktop:device:${id}`);
  if(!raw){res.status(401).json({error:'This desktop pairing is no longer valid.'});return null}
  let device;try{device=JSON.parse(raw)}catch{device=null}
  if(!device||!equalHex(device.tokenHash,hash(token))){res.status(401).json({error:'Invalid desktop credentials.'});return null}
  return {id,device};
}
async function touchDevice(id,device){
  const next={...device,lastSeen:Date.now()};
  await redis('set',`stellar:desktop:device:${id}`,JSON.stringify(next));
  await redis('expire',`stellar:desktop:device:${id}`,DEVICE_TTL_SECONDS);
  return next;
}
function cleanTask(input){
  const type=String(input?.type||'').trim();
  if(!ALL_TYPES.has(type)) throw new Error('Unsupported desktop action.');
  const args=input?.args&&typeof input.args==='object'&&!Array.isArray(input.args)?input.args:{};
  const task={id:crypto.randomUUID(),type,args,createdAt:Date.now(),approved:SAFE_TYPES.has(type)||input?.approved===true};
  if(APPROVAL_TYPES.has(type)&&task.approved!==true) throw new Error('This desktop action requires explicit approval.');
  return task;
}
export default async function handler(req,res){
  setCors(req,res);
  if(req.method==='OPTIONS') return res.status(204).end();
  const action=String(req.method==='GET'?req.query?.action:req.body?.action||'').trim();

  try{
    if(action==='claimPair'){
      if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
      const code=String(req.body?.code||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
      if(code.length<8) return res.status(400).json({error:'Enter the full pairing code.'});
      const raw=await redis('get',`stellar:desktop:pair:${code}`);
      if(!raw) return res.status(404).json({error:'Pairing code expired or was already used.'});
      let pair;try{pair=JSON.parse(raw)}catch{pair=null}
      if(!pair||pair.expiresAt<Date.now()||!isOwnerEmail(pair.email)) return res.status(400).json({error:'Pairing code is invalid.'});
      const deviceId=crypto.randomUUID();
      const deviceToken=crypto.randomBytes(32).toString('base64url');
      const hostname=String(req.body?.hostname||'Windows PC').slice(0,80);
      const platform=String(req.body?.platform||'win32').slice(0,40);
      const device={email:pair.email,hostname,platform,tokenHash:hash(deviceToken),createdAt:Date.now(),lastSeen:Date.now()};
      await redis('set',`stellar:desktop:device:${deviceId}`,JSON.stringify(device));
      await redis('expire',`stellar:desktop:device:${deviceId}`,DEVICE_TTL_SECONDS);
      await redis('set',`stellar:desktop:owner:${pair.email}`,deviceId);
      await redis('expire',`stellar:desktop:owner:${pair.email}`,DEVICE_TTL_SECONDS);
      await redis('del',`stellar:desktop:pair:${code}`);
      return res.status(200).json({ok:true,deviceId,deviceToken,hostname});
    }

    if(action==='poll'){
      if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
      const auth=await deviceAuth(req,res); if(!auth) return;
      await touchDevice(auth.id,auth.device);
      const raw=await redis('lpop',`stellar:desktop:queue:${auth.id}`);
      if(!raw) return res.status(200).json({ok:true,task:null});
      let task;try{task=JSON.parse(raw)}catch{task=null}
      if(!task) return res.status(200).json({ok:true,task:null});
      await redis('set',`stellar:desktop:task:${task.id}`,JSON.stringify({...task,status:'running',startedAt:Date.now()}));
      await redis('expire',`stellar:desktop:task:${task.id}`,TASK_TTL_SECONDS);
      return res.status(200).json({ok:true,task});
    }

    if(action==='report'){
      if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
      const auth=await deviceAuth(req,res); if(!auth) return;
      await touchDevice(auth.id,auth.device);
      const taskId=String(req.body?.taskId||'').trim();
      if(!/^[0-9a-f-]{36}$/i.test(taskId)) return res.status(400).json({error:'Invalid task id.'});
      const result={
        taskId,
        ok:req.body?.ok===true,
        output:String(req.body?.output||'').slice(0,120000),
        error:String(req.body?.error||'').slice(0,4000),
        finishedAt:Date.now(),
      };
      const raw=await redis('get',`stellar:desktop:task:${taskId}`);
      let task={id:taskId};try{if(raw)task={...task,...JSON.parse(raw)}}catch{}
      await redis('set',`stellar:desktop:task:${taskId}`,JSON.stringify({...task,status:result.ok?'completed':'failed',result}));
      await redis('expire',`stellar:desktop:task:${taskId}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:desktop:last:${auth.id}`,JSON.stringify(result));
      await redis('expire',`stellar:desktop:last:${auth.id}`,TASK_TTL_SECONDS);
      return res.status(200).json({ok:true});
    }

    const session=owner(req,res); if(!session) return;

    if(action==='createPair'){
      if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
      const code=crypto.randomBytes(6).toString('hex').toUpperCase();
      const pair={email:session.email,expiresAt:Date.now()+PAIR_TTL_SECONDS*1000};
      await redis('set',`stellar:desktop:pair:${code}`,JSON.stringify(pair));
      await redis('expire',`stellar:desktop:pair:${code}`,PAIR_TTL_SECONDS);
      return res.status(200).json({ok:true,code,expiresIn:PAIR_TTL_SECONDS});
    }

    const deviceId=String(await redis('get',`stellar:desktop:owner:${session.email}`)||'');
    if(action==='status'){
      if(!deviceId) return res.status(200).json({ok:true,paired:false});
      const raw=await redis('get',`stellar:desktop:device:${deviceId}`);
      if(!raw) return res.status(200).json({ok:true,paired:false});
      let device;try{device=JSON.parse(raw)}catch{device=null}
      if(!device) return res.status(200).json({ok:true,paired:false});
      const lastRaw=await redis('get',`stellar:desktop:last:${deviceId}`);
      let lastResult=null;try{if(lastRaw)lastResult=JSON.parse(lastRaw)}catch{}
      return res.status(200).json({ok:true,paired:true,deviceId,hostname:device.hostname,platform:device.platform,lastSeen:device.lastSeen,online:Date.now()-Number(device.lastSeen||0)<90000,lastResult});
    }

    if(!deviceId) return res.status(409).json({error:'Pair a Windows PC first.'});

    if(action==='enqueue'){
      if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
      const task=cleanTask(req.body?.task);
      await redis('rpush',`stellar:desktop:queue:${deviceId}`,JSON.stringify(task));
      await redis('expire',`stellar:desktop:queue:${deviceId}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:desktop:task:${task.id}`,JSON.stringify({...task,status:'queued'}));
      await redis('expire',`stellar:desktop:task:${task.id}`,TASK_TTL_SECONDS);
      return res.status(200).json({ok:true,taskId:task.id,status:'queued'});
    }

    if(action==='taskStatus'){
      const taskId=String(req.query?.taskId||req.body?.taskId||'').trim();
      if(!taskId) return res.status(400).json({error:'taskId is required.'});
      const raw=await redis('get',`stellar:desktop:task:${taskId}`);
      if(!raw) return res.status(404).json({error:'Task not found.'});
      let task;try{task=JSON.parse(raw)}catch{return res.status(500).json({error:'Task state is invalid.'})}
      return res.status(200).json({ok:true,task});
    }

    if(action==='disconnect'){
      if(req.method!=='POST') return res.status(405).json({error:'POST required.'});
      await redis('del',`stellar:desktop:owner:${session.email}`);
      await redis('del',`stellar:desktop:device:${deviceId}`);
      await redis('del',`stellar:desktop:queue:${deviceId}`);
      return res.status(200).json({ok:true});
    }

    return res.status(400).json({error:'Unknown desktop-agent action.'});
  }catch(error){
    console.error('Desktop agent error',error?.message||error);
    return res.status(500).json({error:error?.message||'Desktop agent request failed.'});
  }
}
