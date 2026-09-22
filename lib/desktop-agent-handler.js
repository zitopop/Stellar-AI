// Desktop Agent bridge between Stellar web and each signed-in user's paired local Windows companion.
import crypto from 'crypto';
import { requireSession } from '../lib/auth.js';
import { isPluginEnabled } from './plugin-registry.js';

const KV_URL=process.env.KV_REST_API_URL;
const KV_TOKEN=process.env.KV_REST_API_TOKEN;
const PAIR_TTL_SECONDS=600;
const DEVICE_TTL_SECONDS=60*60*24*90;
const TASK_TTL_SECONDS=60*60*24;
const SAFE_TYPES=new Set(['read_file','list_directory','search_files','git_status','git_diff']);
const APPROVAL_TYPES=new Set(['write_file','mkdir','run_command','open_url']);
const ALL_TYPES=new Set([...SAFE_TYPES,...APPROVAL_TYPES]);
const DEFAULT_POLICY={read:true,write:true,shell:false,openUrl:true};

function redactSensitive(value){
  let s=String(value??'');
  s=s.replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/gi,'[REDACTED PRIVATE KEY]');
  s=s.replace(/\b(sk-(?:proj-)?[A-Za-z0-9_-]{16,}|sk_(?:live|test)_[A-Za-z0-9]{16,}|rk_(?:live|test)_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{12,}|AKIA[A-Z0-9]{16})\b/g,'[REDACTED TOKEN]');
  s=s.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{16,}/gi,'Bearer [REDACTED]');
  s=s.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,'[REDACTED JWT]');
  s=s.replace(/\b((?:api[_-]?key|token|secret|password|passwd|pwd|private[_-]?key|client[_-]?secret|auth[_-]?token)\s*[:=]\s*)([^\s,;\r\n"']{6,})/gi,'$1[REDACTED]');
  s=s.replace(/(https?:\/\/[^\s:@/]+:)([^\s@/]+)(@)/gi,'$1[REDACTED]$3');
  return s;
}
function containsSensitive(value){return redactSensitive(value)!==String(value??'')}

function setCors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin',allowed?origin:'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Stellar-Device-Id, X-Stellar-Device-Token');
  res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
}
async function redis(command,...args){
  if(!KV_URL||!KV_TOKEN)throw new Error('Desktop agent storage is not configured.');
  const p=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const r=await fetch(`${KV_URL}/${p}`,{headers:{Authorization:`Bearer ${KV_TOKEN}`},signal:AbortSignal.timeout(8000)});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||`Storage command ${command} failed.`);return d?.result;
}
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
function equalHex(a,b){try{const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}catch{return false}}
function account(req,res){const s=requireSession(req,res);if(!s)return null;return s}
async function audit(email,event,detail={}){
  try{
    const record={id:crypto.randomUUID(),at:Date.now(),event,...detail};
    await redis('lpush',`stellar:desktop:audit:${email}`,JSON.stringify(record));
    await redis('ltrim',`stellar:desktop:audit:${email}`,'0','199');
    await redis('expire',`stellar:desktop:audit:${email}`,60*60*24*90);
  }catch{}
}
async function getPolicy(email){
  const raw=await redis('get',`stellar:desktop:policy:${email}`);
  if(!raw)return {...DEFAULT_POLICY};
  try{return {...DEFAULT_POLICY,...JSON.parse(raw)}}catch{return {...DEFAULT_POLICY}}
}
async function setPolicy(email,input){
  const p={read:input?.read!==false,write:input?.write!==false,shell:input?.shell===true,openUrl:input?.openUrl!==false};
  await redis('set',`stellar:desktop:policy:${email}`,JSON.stringify(p));
  await redis('expire',`stellar:desktop:policy:${email}`,DEVICE_TTL_SECONDS);
  return p;
}
async function emergencyStopped(email){return String(await redis('get',`stellar:desktop:stop:${email}`)||'')==='1'}
async function underLimit(email,scope,limit,windowSeconds){const bucket=Math.floor(Date.now()/(windowSeconds*1000));const key=`stellar:desktop:limit:${scope}:${hash(String(email).toLowerCase())}:${bucket}`;const n=Number(await redis('incr',key)||0);if(n===1)await redis('expire',key,windowSeconds+60);return n<=limit}
async function deviceAuth(req,res){
  const id=String(req.headers['x-stellar-device-id']||'').trim(),token=String(req.headers['x-stellar-device-token']||'').trim();
  if(!id||!token){res.status(401).json({error:'Device credentials are required.'});return null}
  const raw=await redis('get',`stellar:desktop:device:${id}`);if(!raw){res.status(401).json({error:'This desktop pairing is no longer valid.'});return null}
  let d;try{d=JSON.parse(raw)}catch{d=null}
  if(!d||!equalHex(d.tokenHash,hash(token))){res.status(401).json({error:'Invalid desktop credentials.'});return null}
  return {id,device:d};
}
async function touchDevice(id,d){const n={...d,lastSeen:Date.now()};await redis('set',`stellar:desktop:device:${id}`,JSON.stringify(n));await redis('expire',`stellar:desktop:device:${id}`,DEVICE_TTL_SECONDS);return n}
const SYSTEM_PATH_RE=/(?:^|[\\/])(?:windows|program files|programdata|system32|syswow64)(?:[\\/]|$)/i;
const SECRET_PATH_RE=/(?:^|[\\/])(?:\.ssh|\.gnupg|\.aws|\.azure|\.kube|credentials?|cookies?|login data|wallets?|keychains?|vault|\.env(?:\.[^\\/]+)?|\.npmrc|\.git-credentials|id_rsa|id_ed25519)(?:[\\/]|$)/i;
const BLOCKED_COMMAND_RE=/(?:\b(?:format|diskpart|bcdedit|shutdown|restart-computer|stop-computer|cipher\s+\/w|vssadmin\s+delete|wbadmin\s+delete|reg\s+delete|net\s+user|sc\s+(?:config|delete)|set-mppreference|add-mppreference|disable-realtimemonitoring|takeown|icacls)\b|remove-item[^\r\n]*(?:-recurse[^\r\n]*-force|-force[^\r\n]*-recurse)|(?:del|rd|rmdir)\s+\/(?:s|q)|rm\s+-rf|powershell[^\r\n]*-(?:enc|encodedcommand)\b)/i;
function validateArgs(type,args){
  const p=String(args?.path||args?.cwd||'');
  if(p&&(SYSTEM_PATH_RE.test(p)||SECRET_PATH_RE.test(p)))throw new Error('System, credential, browser-secret, or key-store paths are blocked.');
  if(type==='search_files'){
    const q=String(args?.query||'').trim();
    if(!q||q.length>200)throw new Error('Search query is missing or too long.');
    const max=Number(args?.maxResults);
    if(Number.isFinite(max)&&(max<1||max>120))throw new Error('Search result limit must be between 1 and 120.');
  }
  if(type==='git_diff'&&args?.path){
    const gp=String(args.path||'');
    if(SYSTEM_PATH_RE.test(gp)||SECRET_PATH_RE.test(gp))throw new Error('System, credential, browser-secret, or key-store paths are blocked.');
  }
  if(type==='run_command'){
    const c=String(args?.command||'');
    if(!c||c.length>4000)throw new Error('Command is empty or too long.');
    if(BLOCKED_COMMAND_RE.test(c))throw new Error('This command is blocked by Stellar Desktop safeguards.');
    if(/(?:\bprintenv\b|\bgh\s+auth\s+token\b|\bgit\s+credential\b|\bvercel\s+env\s+pull\b|\bget-childitem\s+env:|\bgci\s+env:|\bdir\s+env:|\bcmd(?:\.exe)?\s+\/c\s+set\b)/i.test(c))throw new Error('Credential or environment dumping commands are blocked.');
    if(containsSensitive(c))throw new Error('Commands containing likely credentials or secrets are blocked.');
  }
  if(type==='write_file'&&containsSensitive(args?.content))throw new Error('Writing likely credentials or secrets through the cloud PC Agent is blocked. Use a local secret manager or enter the secret directly on the PC instead.');
  if(type==='open_url'){
    const u=new URL(String(args?.url||''));if(!['https:','http:'].includes(u.protocol))throw new Error('Only http/https URLs can be opened.');
  }
}
function cleanTask(policy,input){
  const type=String(input?.type||'').trim();if(!ALL_TYPES.has(type))throw new Error('Unsupported desktop action.');
  const args=input?.args&&typeof input.args==='object'&&!Array.isArray(input.args)?input.args:{};
  if(SAFE_TYPES.has(type)&&policy.read!==true)throw new Error('Read access is disabled.');
  if(['write_file','mkdir'].includes(type)&&policy.write!==true)throw new Error('Write access is disabled.');
  if(type==='run_command'&&policy.shell!==true)throw new Error('Shell access is disabled in PC Agent permissions.');
  if(type==='open_url'&&policy.openUrl!==true)throw new Error('URL opening is disabled.');
  validateArgs(type,args);
  const approved=SAFE_TYPES.has(type)||input?.approved===true;
  if(APPROVAL_TYPES.has(type)&&!approved)throw new Error('This desktop action requires explicit approval.');
  return {id:crypto.randomUUID(),type,args,createdAt:Date.now(),approved};
}
export default async function handler(req,res){
  setCors(req,res);if(req.method==='OPTIONS')return res.status(204).end();
  const action=String(req.method==='GET'?req.query?.action:req.body?.action||'').trim();
  try{
    if(action==='claimPair'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
      const code=String(req.body?.code||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();if(code.length<8)return res.status(400).json({error:'Enter the full pairing code.'});
      const raw=await redis('get',`stellar:desktop:pair:${code}`);if(!raw)return res.status(404).json({error:'Pairing code expired or was already used.'});
      let pair;try{pair=JSON.parse(raw)}catch{pair=null}
      if(!pair||pair.expiresAt<Date.now()||!pair.email)return res.status(400).json({error:'Pairing code is invalid.'});
      if(await emergencyStopped(pair.email))return res.status(423).json({error:'Emergency Stop is active. Resume PC Agent before pairing.'});
      const deviceId=crypto.randomUUID(),deviceToken=crypto.randomBytes(32).toString('base64url');
      const hostname=String(req.body?.hostname||'Windows PC').slice(0,80),platform=String(req.body?.platform||'win32').slice(0,40);
      const device={email:pair.email,hostname,platform,tokenHash:hash(deviceToken),createdAt:Date.now(),lastSeen:Date.now()};
      const previousId=String(await redis('get',`stellar:desktop:owner:${pair.email}`)||'');if(previousId&&previousId!==deviceId){await redis('del',`stellar:desktop:device:${previousId}`);await redis('del',`stellar:desktop:queue:${previousId}`)}
      await redis('set',`stellar:desktop:device:${deviceId}`,JSON.stringify(device));await redis('expire',`stellar:desktop:device:${deviceId}`,DEVICE_TTL_SECONDS);
      await redis('set',`stellar:desktop:owner:${pair.email}`,deviceId);await redis('expire',`stellar:desktop:owner:${pair.email}`,DEVICE_TTL_SECONDS);await redis('del',`stellar:desktop:pair:${code}`);
      await audit(pair.email,'device_paired',{deviceId,hostname,platform});return res.status(200).json({ok:true,deviceId,deviceToken,hostname});
    }
    if(action==='poll'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});const a=await deviceAuth(req,res);if(!a)return;
      await touchDevice(a.id,a.device);
      if(!(await isPluginEnabled(a.device.email,'pc-agent')))return res.status(200).json({ok:true,stopped:true,disabled:true,task:null});
      if(await emergencyStopped(a.device.email))return res.status(200).json({ok:true,stopped:true,task:null});
      const raw=await redis('lpop',`stellar:desktop:queue:${a.id}`);if(!raw)return res.status(200).json({ok:true,task:null});
      let task;try{task=JSON.parse(raw)}catch{task=null}if(!task)return res.status(200).json({ok:true,task:null});
      const stateRaw=await redis('get',`stellar:desktop:task:${task.id}`);let state={};try{if(stateRaw)state=JSON.parse(stateRaw)}catch{}await redis('set',`stellar:desktop:task:${task.id}`,JSON.stringify({...state,...task,status:'running',startedAt:Date.now()}));await redis('expire',`stellar:desktop:task:${task.id}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:desktop:active:${a.id}`,JSON.stringify({taskId:task.id,type:task.type,startedAt:Date.now(),hostname:a.device.hostname||'Windows PC'}));await redis('expire',`stellar:desktop:active:${a.id}`,TASK_TTL_SECONDS);
      await audit(a.device.email,'task_started',{taskId:task.id,type:task.type});return res.status(200).json({ok:true,task});
    }
    if(action==='report'){
      if(req.method!=='POST')return res.status(405).json({error:'POST required.'});const a=await deviceAuth(req,res);if(!a)return;await touchDevice(a.id,a.device);
      const taskId=String(req.body?.taskId||'').trim();if(!/^[0-9a-f-]{36}$/i.test(taskId))return res.status(400).json({error:'Invalid task id.'});
      const raw=await redis('get',`stellar:desktop:task:${taskId}`);let task={id:taskId};try{if(raw)task={...task,...JSON.parse(raw)}}catch{}
      if(task.deviceId&&task.deviceId!==a.id)return res.status(403).json({error:'Task does not belong to this device.'});
      const result={taskId,ok:req.body?.ok===true,output:redactSensitive(String(req.body?.output||'')).slice(0,120000),error:redactSensitive(String(req.body?.error||'')).slice(0,4000),finishedAt:Date.now()};
      await redis('set',`stellar:desktop:task:${taskId}`,JSON.stringify({...task,status:result.ok?'completed':'failed',result}));await redis('expire',`stellar:desktop:task:${taskId}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:desktop:last:${a.id}`,JSON.stringify(result));await redis('expire',`stellar:desktop:last:${a.id}`,TASK_TTL_SECONDS);
      await redis('del',`stellar:desktop:active:${a.id}`);
      await audit(a.device.email,result.ok?'task_completed':'task_failed',{taskId,type:task.type||'',error:result.ok?'':result.error.slice(0,300)});return res.status(200).json({ok:true});
    }

    const session=account(req,res);if(!session)return;
    if(action==='createPair'){
      if(!(await isPluginEnabled(session.email,'pc-agent')))return res.status(423).json({error:'PC Agent is disabled in Plugins.'});
      if(!(await underLimit(session.email,'pair',6,600)))return res.status(429).json({error:'Too many pairing-code requests. Try again shortly.'});
      if(await emergencyStopped(session.email))return res.status(423).json({error:'Emergency Stop is active. Resume PC Agent first.'});
      const code=crypto.randomBytes(8).toString('hex').toUpperCase(),pair={email:session.email,expiresAt:Date.now()+PAIR_TTL_SECONDS*1000};
      await redis('set',`stellar:desktop:pair:${code}`,JSON.stringify(pair));await redis('expire',`stellar:desktop:pair:${code}`,PAIR_TTL_SECONDS);await audit(session.email,'pair_code_created');return res.status(200).json({ok:true,code,expiresIn:PAIR_TTL_SECONDS});
    }
    if(action==='policy'&&req.method==='GET')return res.status(200).json({ok:true,policy:await getPolicy(session.email),emergencyStopped:await emergencyStopped(session.email)});
    if(action==='setPolicy'){
      const policy=await setPolicy(session.email,req.body?.policy||{});await audit(session.email,'policy_changed',{policy});return res.status(200).json({ok:true,policy});
    }
    if(action==='emergencyStop'){
      await redis('set',`stellar:desktop:stop:${session.email}`,'1');await redis('expire',`stellar:desktop:stop:${session.email}`,DEVICE_TTL_SECONDS);
      const id=String(await redis('get',`stellar:desktop:owner:${session.email}`)||'');if(id){await redis('del',`stellar:desktop:queue:${id}`);await redis('del',`stellar:desktop:active:${id}`);}
      await audit(session.email,'emergency_stop');return res.status(200).json({ok:true,emergencyStopped:true});
    }
    if(action==='resume'){
      if(req.body?.confirm!==true)return res.status(400).json({error:'Explicit resume confirmation is required.'});
      await redis('del',`stellar:desktop:stop:${session.email}`);await audit(session.email,'emergency_resume');return res.status(200).json({ok:true,emergencyStopped:false});
    }
    if(action==='audit'){
      const rows=await redis('lrange',`stellar:desktop:audit:${session.email}`,'0','99');
      return res.status(200).json({ok:true,events:(Array.isArray(rows)?rows:[]).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean)});
    }

    const deviceId=String(await redis('get',`stellar:desktop:owner:${session.email}`)||'');
    if(action==='status'){
      const enabled=await isPluginEnabled(session.email,'pc-agent');
      const stopped=await emergencyStopped(session.email),policy=await getPolicy(session.email);
      if(!deviceId)return res.status(200).json({ok:true,paired:false,enabled,emergencyStopped:stopped,policy});
      const raw=await redis('get',`stellar:desktop:device:${deviceId}`);if(!raw)return res.status(200).json({ok:true,paired:false,emergencyStopped:stopped,policy});
      let d;try{d=JSON.parse(raw)}catch{d=null}if(!d)return res.status(200).json({ok:true,paired:false,emergencyStopped:stopped,policy});
      const lr=await redis('get',`stellar:desktop:last:${deviceId}`);let lastResult=null;try{if(lr)lastResult=JSON.parse(lr)}catch{}
      const ar=await redis('get',`stellar:desktop:active:${deviceId}`);let activeTask=null;try{if(ar)activeTask=JSON.parse(ar)}catch{}
      return res.status(200).json({ok:true,paired:true,enabled,deviceId,hostname:d.hostname,platform:d.platform,lastSeen:d.lastSeen,online:enabled&&!stopped&&Date.now()-Number(d.lastSeen||0)<90000,activeTask,lastResult,emergencyStopped:stopped,policy});
    }
    if(!deviceId)return res.status(409).json({error:'Pair a Windows PC first.'});
    if(action==='enqueue'){
      if(!(await isPluginEnabled(session.email,'pc-agent')))return res.status(423).json({error:'PC Agent is disabled in Plugins.'});
      if(!(await underLimit(session.email,'task',120,3600)))return res.status(429).json({error:'PC Agent task limit reached for this hour.'});
      if(await emergencyStopped(session.email))return res.status(423).json({error:'Emergency Stop is active.'});
      const policy=await getPolicy(session.email),task=cleanTask(policy,req.body?.task);
      await redis('rpush',`stellar:desktop:queue:${deviceId}`,JSON.stringify(task));await redis('expire',`stellar:desktop:queue:${deviceId}`,TASK_TTL_SECONDS);
      await redis('set',`stellar:desktop:task:${task.id}`,JSON.stringify({...task,status:'queued',accountHash:hash(String(session.email).toLowerCase()),deviceId}));await redis('expire',`stellar:desktop:task:${task.id}`,TASK_TTL_SECONDS);
      await audit(session.email,'task_queued',{taskId:task.id,type:task.type});return res.status(200).json({ok:true,taskId:task.id,status:'queued'});
    }
    if(action==='taskStatus'){
      const taskId=String(req.query?.taskId||req.body?.taskId||'').trim();if(!taskId)return res.status(400).json({error:'taskId is required.'});
      const raw=await redis('get',`stellar:desktop:task:${taskId}`);if(!raw)return res.status(404).json({error:'Task not found.'});
      let task;try{task=JSON.parse(raw)}catch{return res.status(500).json({error:'Task state is invalid.'})}if(task.accountHash&&task.accountHash!==hash(String(session.email).toLowerCase()))return res.status(404).json({error:'Task not found.'});return res.status(200).json({ok:true,task});
    }
    if(action==='disconnect'){
      await redis('del',`stellar:desktop:owner:${session.email}`);await redis('del',`stellar:desktop:device:${deviceId}`);await redis('del',`stellar:desktop:queue:${deviceId}`);await redis('del',`stellar:desktop:active:${deviceId}`);
      await audit(session.email,'device_disconnected',{deviceId});return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:'Unknown desktop-agent action.'});
  }catch(error){console.error('Desktop agent error',error?.message||error);return res.status(500).json({error:error?.message||'Desktop agent request failed.'})}
}
