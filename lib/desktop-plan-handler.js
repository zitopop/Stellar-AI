// Desktop planner — converts a signed-in user's prompt into reviewable desktop actions.
import crypto from 'crypto';
import { requireSession, isOwnerEmail } from '../lib/auth.js';
import { kvGet } from './profile.js';
import { normalisePlan } from './pricing.js';
import { consumeUsage, refundUsageCharge } from './usage.js';

const ANTHROPIC_KEY=process.env.ANTHROPIC_API_KEY;
const MODEL=process.env.DESKTOP_AGENT_MODEL||'claude-sonnet-4-6';
const KV_URL=process.env.KV_REST_API_URL;
const KV_TOKEN=process.env.KV_REST_API_TOKEN;
const STELLARX_PLAN_CREDIT_COST=20;
const ALLOWED=new Set(['read_file','list_directory','search_files','git_status','git_diff','apply_patch','write_file','mkdir','run_command','keyboard_shortcut','type_text','mouse_move','mouse_click','open_url']);

const accountHash=v=>crypto.createHash('sha256').update(String(v).toLowerCase()).digest('hex');
async function allowPlan(email){if(!KV_URL||!KV_TOKEN)return null;const bucket=Math.floor(Date.now()/3600000);const key=`stellar:desktop:plan-limit:${accountHash(email)}:${bucket}`;try{const r=await fetch(`${KV_URL}/incr/${encodeURIComponent(key)}`,{headers:{Authorization:`Bearer ${KV_TOKEN}`},signal:AbortSignal.timeout(8000)});const d=await r.json().catch(()=>({}));if(!r.ok)return null;const n=Number(d?.result||0);if(n===1)await fetch(`${KV_URL}/expire/${encodeURIComponent(key)}/3660`,{headers:{Authorization:`Bearer ${KV_TOKEN}`},signal:AbortSignal.timeout(8000)}).catch(()=>{});return n<=12}catch{return null}}
function promptHasSecret(value){const s=String(value||'');return /-----BEGIN [^-\r\n]*PRIVATE KEY-----|\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}|\b(?:api[_-]?key|token|secret|password|passwd|pwd|private[_-]?key|client[_-]?secret)\s*[:=]\s*[^\s,;\r\n]{6,}/i.test(s)}

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
  const planAllowed=isOwnerEmail(session.email)?true:await allowPlan(session.email);
  if(planAllowed===null) return res.status(503).json({error:'PC Agent planning is temporarily unavailable.'});
  if(!planAllowed) return res.status(429).json({error:'PC Agent planning limit reached for this hour.'});
  if(!ANTHROPIC_KEY) return res.status(503).json({error:'Desktop planner model is not configured.'});
  const prompt=String(req.body?.prompt||'').trim().slice(0,12000);
  const observations=String(req.body?.observations||'').trim().slice(0,50000);
  if(!prompt) return res.status(400).json({error:'Describe what you want the PC agent to do.'});
  if(promptHasSecret(prompt)) return res.status(400).json({error:'Remove passwords, API keys, tokens or private keys before sending this PC Agent request.'});

  let creditUsage=null;
  const owner=isOwnerEmail(session.email);
  if(!owner){
    if(!KV_URL||!KV_TOKEN) return res.status(503).json({error:'Stellar credit checks are temporarily unavailable.'});
    const user=(await kvGet(KV_URL,KV_TOKEN,'stellar:user:'+String(session.email).toLowerCase().trim()))||{plan:'free',createdAt:Date.now()};
    const plan=normalisePlan(user.plan)||'free';
    const creditAnchorAt=Math.max(0,Number(user.planCreditAnchorAt||user.createdAt||Date.now())||Date.now());
    creditUsage=await consumeUsage({
      url:KV_URL,token:KV_TOKEN,identity:'email:'+String(session.email).toLowerCase().trim(),plan,
      walletKey:'stellar:user:'+String(session.email).toLowerCase().trim(),allowCredit:true,
      creditCost:STELLARX_PLAN_CREDIT_COST,creditAnchorAt,
    });
    if(!creditUsage.allowed) return res.status(429).json({error:'You do not have enough Stellar credits for this StellarX planning pass. Add credits, upgrade, or wait for your plan credits to refresh.',usage:creditUsage});
  }

  const phase=observations?'implement':'inspect';
  const system=`You are Stellar Coding Agent Planner for the signed-in user's paired computer. Work like a careful repository coding agent: inspect first, ground changes in evidence, then edit, test, and review.
Allowed action types only:
- read_file {path}
- list_directory {path}
- search_files {query,path?,maxResults?}
- git_status {cwd?}
- git_diff {cwd?,path?,staged?}
- apply_patch {path,find,replace}\n- write_file {path,content}
- mkdir {path}
- run_command {command,cwd?}
- keyboard_shortcut {shortcut} — safe allowlist only: CTRL+TAB, CTRL+SHIFT+TAB, ALT+TAB, CTRL+L, CTRL+W, CTRL+R\n- type_text {text} — types into the currently focused app; never use for passwords, tokens or secrets\n- mouse_move {x,y} — move pointer to visible screen coordinates\n- mouse_click {x,y,button?,clicks?} — click visible screen coordinates; button is left/right/middle and clicks is 1 or 2\n- open_url {url}

Core engineering loop:
1. UNDERSTAND — infer the requested outcome and preserve existing interfaces unless change is required.
2. INSPECT — search/list/read only the files needed to understand the implementation and current git state.
3. IMPLEMENT — make the smallest complete change grounded in inspected evidence.
4. VERIFY — run focused tests or checks when shell permission is available; otherwise include the exact verification command as an approval-required action.
5. REVIEW — inspect git diff after edits and catch accidental or unrelated changes.

Rules:
- All file paths must be relative to the paired workspace root unless the user explicitly names a subfolder.
- Never guess file contents that can be inspected first.
- Prefer reading/listing before modifying when context is needed.
- Use no more than 8 actions per phase.
- Never request passwords, tokens, browser cookies, credential stores, private keys, wallet seeds, or security-question data.
- Never create persistence, disable security tools, evade access controls, exfiltrate data, wipe disks, encrypt files, or run destructive commands.
- Never access Windows system directories, browser profile/cookie stores, credential stores, .ssh, .gnupg, cloud credential folders, wallet/key stores, or secrets outside the paired workspace.
- Never propose account/security ownership changes, credential extraction, antivirus/firewall disabling, disk formatting, registry deletion, user-account creation, or destructive recursive deletion.
- Prefer apply_patch over write_file for existing files because it makes a precise evidence-grounded replacement and preserves unrelated content. Use write_file for new files or when a full replacement is genuinely required.\n- Treat apply_patch, write_file, mkdir, run_command, keyboard_shortcut, type_text, mouse_move, mouse_click, and open_url as approval-required actions. Do not mark or imply approval yourself.
- Do not claim actions have run, tests passed, or a deployment succeeded unless the supplied observations prove it.
- For coding work, prefer targeted edits and repository-aware verification.
- Use mouse/keyboard actions only when the user explicitly asks Stella X to interact with a visible app; never use them for hidden/background interaction.
- In INSPECT phase, normally return only read_file, list_directory, search_files, git_status, or git_diff. If the user explicitly asks to control a visible app, you may instead return approval-required mouse/keyboard/open_url actions without repository inspection.
- In IMPLEMENT phase, use the observations as evidence. If they are insufficient, return more safe inspection actions instead of inventing code.
- Always include git_diff near the end of an implementation plan after any write action so the user can review the patch.
- Return JSON only in this exact shape: {"phase":"inspect|implement","summary":"...","actions":[{"type":"read_file","args":{"path":"..."},"reason":"..."}]}.

Current phase: ${phase}.`;

  let plannerCompleted=false;
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
    const cleanPlan=validate(extractJson(text));
    plannerCompleted=true;
    return res.status(200).json({ok:true,plan:cleanPlan,credits:owner?{cost:0,remaining:null}:{cost:STELLARX_PLAN_CREDIT_COST,remaining:creditUsage?.remaining??null,addOnCredits:creditUsage?.walletPence??null}});
  }catch(error){
    console.error('Desktop planner failed',error?.message||error);
    return res.status(500).json({error:'Could not build a desktop plan right now.'});
  }finally{
    if(!plannerCompleted&&creditUsage&&(creditUsage.includedCreditsCharged>0||creditUsage.chargedCreditPence>0)){
      try{
        await refundUsageCharge({
          url:KV_URL,token:KV_TOKEN,counterKey:creditUsage._counterKey,
          walletKey:'stellar:user:'+String(session.email).toLowerCase().trim(),
          includedCredits:creditUsage.includedCreditsCharged,
          amountPence:creditUsage.chargedCreditPence,
        });
      }catch(refundError){console.error('Could not refund StellarX credits',refundError?.message||refundError)}
    }
  }
}
