import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesktopPlan } from '../lib/desktop-planner-provider.js';
import {readFileSync} from 'node:fs';

const base={system:'Return a JSON plan with safe actions.',userMessage:'Inspect my project',
  anthropicKey:'test-anthropic',openaiKey:'test-openai',
  parsePlan:text=>{
    const plan=JSON.parse(text);
    assert.ok(Array.isArray(plan.actions));
    return {...plan,actions:plan.actions.map(action=>({...action,requiresApproval:!['read_file','list_directory','search_files','git_status','git_diff'].includes(action.type)}))};
  },
};
const safePlan={phase:'inspect',summary:'Inspect workspace',actions:[{type:'list_directory',args:{path:'.'},reason:'Find files'}]};
const anthropic=plan=>({ok:true,status:200,json:async()=>({content:[{type:'text',text:JSON.stringify(plan)}]})});
const openai=plan=>({ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify(plan)}}]})});
const fail=status=>({ok:false,status,json:async()=>({error:{message:'secret server details'}})});

test('Anthropic valid plan succeeds without touching backup providers',async()=>{
 const calls=[];
 const result=await createDesktopPlan({...base,fetchImpl:async(url,options)=>{calls.push(JSON.parse(options.body).model);return anthropic(safePlan)}});
 assert.equal(result.provider,'anthropic');
 assert.deepEqual(calls,['claude-sonnet-5-5']);
 assert.equal(result.plan.actions[0].requiresApproval,false);
});
test('Anthropic model 404 retries a known compatible model',async()=>{
 const calls=[];
 const result=await createDesktopPlan({...base,fetchImpl:async(url,options)=>{
   calls.push(JSON.parse(options.body).model);
   return calls.length===1?fail(404):anthropic(safePlan);
 }});
 assert.equal(result.provider,'anthropic');
 assert.deepEqual(calls,['claude-sonnet-5-5','claude-sonnet-4-6']);
});
test('Anthropic rate-limit or permissions failure switches to OpenAI JSON mode',async()=>{
 for(const code of [401,429]){
   const calls=[];
   const result=await createDesktopPlan({...base,fetchImpl:async(url,options)=>{
     calls.push({url,body:JSON.parse(options.body)});
     return url.includes('anthropic')?fail(code):openai(safePlan);
   }});
   assert.equal(result.provider,'openai');
   assert.equal(calls.length,2);
   assert.match(calls[1].url,/api\.openai\.com/);
   assert.deepEqual(calls[1].body.response_format,{type:'json_object'});
 }
});
test('Malformed plan is not accepted and falls back, with approval enforced by validator',async()=>{
 const unsafe={phase:'implement',summary:'Edit a file',actions:[{type:'apply_patch',args:{path:'app.html',find:'a',replace:'b'},requiresApproval:false}]};
 let n=0;
 const result=await createDesktopPlan({...base,fetchImpl:async(url)=>{
   n++;
   if(n===1)return {ok:true,status:200,json:async()=>({content:[{type:'text',text:'Not JSON!'}]})};
   return anthropic(unsafe);
 }});
 assert.equal(result.provider,'anthropic');
 assert.equal(n,2);
 assert.equal(result.plan.actions[0].requiresApproval,true);
});
test('Missing keys and exhausted providers produce safe errors',async()=>{
 await assert.rejects(createDesktopPlan({...base,anthropicKey:'',openaiKey:''}),{code:'PLANNER_NOT_CONFIGURED'});
 await assert.rejects(createDesktopPlan({...base,fetchImpl:async()=>fail(503)}),{code:'PLANNER_UPSTREAM_UNAVAILABLE'});
});
test('The handler refunds failed planning and never discloses raw upstream error',()=>{
 const handler=readFileSync(new URL('../lib/desktop-plan-handler.js',import.meta.url),'utf8');
 assert.match(handler,/import \{ createDesktopPlan \}/);
 assert.match(handler,/parsePlan:text=>validate\(extractJson\(text\)\)/);
 assert.match(handler,/refundUsageCharge/);
 assert.doesNotMatch(handler,/if\(!upstream\.ok\) return res\.status\(502\)/);
});
