// Resilient server-only AI transport for StellarX planning.
// A failed model must not silently approve or execute a computer action.
const ANTHROPIC_URL='https://api.anthropic.com/v1/messages';
const OPENAI_URL='https://api.openai.com/v1/chat/completions';
const DEFAULT_ANTHROPIC_MODEL='claude-sonnet-5-5';
const BACKUP_ANTHROPIC_MODEL='claude-sonnet-4-6';
const DEFAULT_OPENAI_MODEL='gpt-4.1-mini';

function modelList(primary){
  return [...new Set([String(primary||DEFAULT_ANTHROPIC_MODEL),BACKUP_ANTHROPIC_MODEL])].filter(Boolean);
}
function textFromAnthropic(data){
  return (data?.content||[]).filter(item=>item?.type==='text').map(item=>String(item.text||'')).join('\n');
}
function textFromOpenAI(data){
  const content=data?.choices?.[0]?.message?.content;
  if(typeof content==='string')return content;
  if(Array.isArray(content))return content.filter(item=>item?.type==='text').map(item=>item.text||'').join('\n');
  return '';
}
function reportFailure(provider,model,code){
  // Never log authentication headers, prompts, returned content, or customer files.
  const status=String(code||'unknown').slice(0,40);
  console.warn('StellarX planner model attempt failed',{provider,model,status});
}
/**
 * Generate a validated planning result. Only successful validated output is accepted.
 * parsePlan is the existing strict JSON/action validator from the desktop handler.
 * fetchImpl can be supplied in focused tests; no credentials leave the server.
 */
export async function createDesktopPlan({
  system,userMessage,parsePlan,
  anthropicKey=process.env.ANTHROPIC_API_KEY,
  openaiKey=process.env.OPENAI_API_KEY,
  anthropicModel=process.env.DESKTOP_AGENT_MODEL||DEFAULT_ANTHROPIC_MODEL,
  openaiModel=process.env.DESKTOP_OPENAI_MODEL||DEFAULT_OPENAI_MODEL,
  fetchImpl=fetch,
}={}){
  if(typeof parsePlan!=='function')throw new TypeError('A plan validator is required.');
  if(!anthropicKey&&!openaiKey){
    const err=new Error('No StellarX planner provider is configured.');
    err.code='PLANNER_NOT_CONFIGURED';
    throw err;
  }
  const prompt=String(userMessage||'');
  if(anthropicKey){
    const candidates=modelList(anthropicModel);
    for(let index=0;index<candidates.length;index++){
      const model=candidates[index];
      try{
        const upstream=await fetchImpl(ANTHROPIC_URL,{
          method:'POST',
          headers:{'x-api-key':anthropicKey,'anthropic-version':'2023-06-01','content-type':'application/json'},
          body:JSON.stringify({model,max_tokens:3500,temperature:0,system,messages:[{role:'user',content:prompt}]}),
          signal:AbortSignal.timeout(index===0?18000:12000),
        });
        if(!upstream.ok){
          reportFailure('anthropic',model,upstream.status);
          // Rate limits, billing/auth failures and invalid requests are usually
          // account-wide: immediately try the separately configured provider.
          if([400,401,402,403,429].includes(upstream.status))break;
          continue;
        }
        const data=await upstream.json();
        try{return {plan:parsePlan(textFromAnthropic(data)),provider:'anthropic'};}
        catch(error){reportFailure('anthropic',model,'invalid_plan');}
      }catch(error){reportFailure('anthropic',model,error?.name==='TimeoutError'?'timeout':'network');}
    }
  }
  if(openaiKey){
    const model=String(openaiModel||DEFAULT_OPENAI_MODEL);
    try{
      const upstream=await fetchImpl(OPENAI_URL,{
        method:'POST',
        headers:{Authorization:'Bearer '+openaiKey,'content-type':'application/json'},
        body:JSON.stringify({
          model,max_tokens:3500,temperature:0,response_format:{type:'json_object'},
          messages:[{role:'system',content:system},{role:'user',content:prompt}],
        }),
        signal:AbortSignal.timeout(14000),
      });
      if(upstream.ok){
        const data=await upstream.json();
        try{return {plan:parsePlan(textFromOpenAI(data)),provider:'openai'};}
        catch(error){reportFailure('openai',model,'invalid_plan');}
      }else reportFailure('openai',model,upstream.status);
    }catch(error){reportFailure('openai',model,error?.name==='TimeoutError'?'timeout':'network');}
  }
  const err=new Error('No AI planning provider could complete this request.');
  err.code='PLANNER_UPSTREAM_UNAVAILABLE';
  throw err;
}
