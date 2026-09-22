// api/desktop-plan.js — converts an owner prompt into reviewable desktop actions.
import { isOwnerEmail, requireSession } from '../lib/auth.js';

const ANTHROPIC_KEY=process.env.ANTHROPIC_API_KEY;
const MODEL=process.env.DESKTOP_AGENT_MODEL||'claude-sonnet-4-6';
const ALLOWED=new Set(['read_file','list_directory','search_files','git_status','git_diff','write_file','mkdir','run_command','open_url']);

function setCors(req,res){
  const origin=String(req.headers.origin||'');
  const allowed=/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin',allowed?origin:'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Vary','Origin');
  res.setHeader('Cache-Control','no-store');
}
function extractJson(text){
  const source=String(text||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  const first=source.indexOf('{'),last=source.lastIndexOf('}');
  if(first<0||last<=first) throw new Error('Planner did not return JSON.');
  return JSON.parse(source.slice(first,last+1));
}
function validate(plan){
  const summary=String(plan?.summary||'').slice(0,1200);
  const actions=Array.isArray(plan?.actions)?plan.actions.slice(0,8):[];
  const clean=actions.map((action,index)=>{
    const type=String(action?.type||'');
    if(!ALLOWED.has(type)) throw new Error(`Planner returned unsupported action #${index+1}.`);
    const args=action?.args&&typeof action.args==='object'&&!Array.isArray(action.args)?action.args:{};
    return {
      type,
      args,
      reason:String(action?.reason||'').slice(0,600),
      requiresApproval:!['read_file','list_directory','search_files','git_status','git_diff'].includes(type),
    };
  });
  const phase=plan?.phase==='implement'?'implement':'inspect';
  return {summary,phase,actions:clean};
}
export default async function handler(req,res){
  setCors(req,res);
  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed.'});
  const session=requireSession(req,res); if(!session)return;
  if(!isOwnerEmail(session.email)) return res.status(403).json({error:'Owner access is required.'});
  if(!ANTHROPIC_KEY) return res.status(503).json({error:'Desktop planner model is not configured.'});
  const prompt=String(req.body?.prompt||'').trim().slice(0,12000);
  const observations=String(req.body?.observations||'').trim().slice(0,50000);
  if(!prompt) return res.status(400).json({error:'Describe what you want the PC agent to do.'});

  const phase=observations?'implement':'inspect';
  const system=`You are Stellar Coding Agent Planner. Work like a careful repository coding agent: inspect first, ground changes in evidence, then edit, test, and review.
Allowed action types only:
- read_file {path}
- list_directory {path}
- search_files {query,path?,maxResults?}
- git_status {cwd?}
- git_diff {cwd?,path?,staged?}
- write_file {path,content}
- mkdir {path}
- run_command {command,cwd?}
- open_url {url}

Core engineering loop:
1. UNDERSTAND — infer the requested outcome and preserve existing interfaces unless change is required.
2. INSPECT — search/list/read only the files needed to understand the implementation and current git state.
3. IMPLEMENT — make the smallest complete change grounded in inspected evidence.
4. VERIFY — run focused tests or checks when shell permission is available; otherwise include the exact verification command as an approval-required action.
5. REVIEW — inspect git diff after edits and catch accidental or unrelated changes.

Rules:
- All file paths must be relative to the paired workspace root unless the owner explicitly names a subfolder.
- Never guess file contents that can be inspected first.
- Use no more than 8 actions per phase.
- Never request passwords, tokens, browser cookies, credential stores, private keys, wallet seeds, or security-question data.
- Never create persistence, disable security tools, evade access controls, exfiltrate data, wipe disks, encrypt files, or run destructive commands.
- Never access Windows system directories, browser profile/cookie stores, credential stores, .ssh, .gnupg, cloud credential folders, wallet/key stores, or secrets outside the paired workspace.
- Never propose account/security ownership changes, credential extraction, antivirus/firewall disabling, disk formatting, registry deletion, user-account creation, or destructive recursive deletion.
- Treat write_file, mkdir, run_command, and open_url as approval-required actions. Do not mark or imply approval yourself.
- Do not claim actions have run, tests passed, or a deployment succeeded unless the supplied observations prove it.
- For coding work, prefer targeted edits and repository-aware verification.
- In INSPECT phase, return only read_file, list_directory, search_files, git_status, or git_diff actions. Do not return writes or commands.
- In IMPLEMENT phase, use the observations as evidence. If they are insufficient, return more safe inspection actions instead of inventing code.
- Always include git_diff near the end of an implementation plan after any write action so the owner can review the patch.
- Return JSON only in this exact shape: {"phase":"inspect|implement","summary":"...","actions":[{"type":"read_file","args":{"path":"..."},"reason":"..."}]}.

Current phase: ${phase}.`;

  try{
    const upstream=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
      body:JSON.stringify({model:MODEL,max_tokens:3500,temperature:0,system,messages:[{role:'user',content:observations?`${prompt}\n\nINSPECTION OBSERVATIONS\n${observations}`:prompt}]}),
      signal:AbortSignal.timeout(45000),
    });
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok) return res.status(502).json({error:'Desktop planner model is temporarily unavailable.'});
    const text=(data?.content||[]).filter(x=>x?.type==='text').map(x=>x.text).join('\n');
    return res.status(200).json({ok:true,plan:validate(extractJson(text))});
  }catch(error){
    console.error('Desktop planner failed',error?.message||error);
    return res.status(500).json({error:'Could not build a desktop plan right now.'});
  }
}
