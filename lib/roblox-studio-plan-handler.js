// Owner-only natural-language planner for the Stellar Roblox Studio bridge.
import { isOwnerEmail, requireSession } from '../lib/auth.js';

const ANTHROPIC_KEY=process.env.ANTHROPIC_API_KEY;
const MODEL=process.env.ROBLOX_STUDIO_AGENT_MODEL||'claude-sonnet-4-6';
const SAFE=new Set(['inspect_tree','read_script']);
const WRITES=new Set(['ensure_folder','ensure_remote_event','ensure_remote_function','upsert_script']);
const ALLOWED=new Set([...SAFE,...WRITES]);

function setCors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin',allowed?origin:'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store');
}
function extractJson(text){
  const source=String(text||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  const first=source.indexOf('{'),last=source.lastIndexOf('}');
  if(first<0||last<=first)throw new Error('Planner did not return JSON.');
  return JSON.parse(source.slice(first,last+1));
}
function validate(plan){
  const phase=plan?.phase==='implement'?'implement':'inspect';
  const summary=String(plan?.summary||'').slice(0,1600);
  const actions=(Array.isArray(plan?.actions)?plan.actions:[]).slice(0,16).map((action,index)=>{
    const type=String(action?.type||'').trim();if(!ALLOWED.has(type))throw new Error(`Planner returned unsupported action #${index+1}.`);
    if(phase==='inspect'&&!SAFE.has(type))throw new Error('Inspection phase may only inspect the place.');
    const args=action?.args&&typeof action.args==='object'&&!Array.isArray(action.args)?action.args:{};
    if(type==='upsert_script'){
      args.path=String(args.path||'').slice(0,900);
      args.className=['Script','LocalScript','ModuleScript'].includes(args.className)?args.className:'Script';
      args.source=String(args.source||'').slice(0,250000);
      if(!args.path||!args.source.trim())throw new Error('Planner returned an incomplete script action.');
    }
    return {type,args,reason:String(action?.reason||'').slice(0,700),requiresApproval:WRITES.has(type)};
  });
  return {phase,summary,actions};
}
export default async function handler(req,res){
  setCors(req,res);if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const session=requireSession(req,res);if(!session)return;
  if(!isOwnerEmail(session.email))return res.status(403).json({error:'Owner access is required.'});
  if(!ANTHROPIC_KEY)return res.status(503).json({error:'Roblox Studio planner is not configured.'});
  const prompt=String(req.body?.prompt||'').trim().slice(0,16000);
  const observations=String(req.body?.observations||'').trim().slice(0,80000);
  if(!prompt)return res.status(400).json({error:'Describe the Roblox game or feature you want to build.'});
  const phase=observations?'implement':'inspect';

  const system=`You are Stellar Roblox Studio Coding Agent. You turn the owner's plain-English Roblox request into a safe inspect-then-build plan for the open Studio place.

Supported actions:
- inspect_tree {path:"game"|allowed-service-path, depth:1..6}
- read_script {path}
- ensure_folder {path}
- ensure_remote_event {path}
- ensure_remote_function {path}
- upsert_script {path,className:"Script"|"LocalScript"|"ModuleScript",source}

Allowed root services: Workspace, ReplicatedStorage, ServerScriptService, ServerStorage, StarterGui, StarterPlayer, StarterPack, Lighting.

Engineering rules:
- First understand the existing game. In inspect phase use only inspect_tree/read_script and inspect the smallest useful area.
- In implement phase, use the supplied observations as ground truth. Do not invent existing object names, scripts, remotes, or architecture.
- Build server-authoritative Roblox systems. Never trust client-provided currency, inventory, rewards, ownership, permissions, damage, purchases, or cooldown state.
- Validate RemoteEvent/RemoteFunction inputs for types, ranges, ownership, permissions, rate limits, and duplicate requests.
- Keep DataStore operations server-side, use pcall, sensible retry/error handling, stable keys, and UpdateAsync when concurrent mutation matters.
- Keep secrets and external credentials out of Roblox source.
- Prefer modular ModuleScripts and configuration tables for larger systems.
- Preserve existing working systems and make the smallest complete change.
- Every referenced module, remote, folder, function, variable, service, and object must exist in the plan or clearly already exist in the observations.
- Do not use placeholder comments such as "rest of code here" or TODO for required behavior.
- Do not claim the place was run, published, or play-tested.
- Up to 16 actions per phase.
- Current phase: ${phase}.
- Return JSON only: {"phase":"inspect|implement","summary":"...","actions":[{"type":"inspect_tree","args":{"path":"game","depth":3},"reason":"..."}]}.`;

  try{
    const upstream=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body:JSON.stringify({
        model:MODEL,max_tokens:phase==='implement'?10000:3500,temperature:0,system,
        messages:[{role:'user',content:observations?`${prompt}\n\nSTUDIO INSPECTION OBSERVATIONS\n${observations}`:prompt}],
      }),
      signal:AbortSignal.timeout(65000),
    });
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok)return res.status(502).json({error:'Roblox Studio planner is temporarily unavailable.'});
    const text=(data?.content||[]).filter(x=>x?.type==='text').map(x=>x.text).join('\n');
    return res.status(200).json({ok:true,plan:validate(extractJson(text))});
  }catch(error){
    console.error('Roblox Studio planner failed',error?.message||error);
    return res.status(500).json({error:'Could not build the Roblox Studio plan right now.'});
  }
}
