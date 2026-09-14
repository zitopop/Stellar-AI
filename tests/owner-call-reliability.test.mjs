import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { getOwnerCallConfiguration } from '../lib/owner-call.js';
import { handleOwnerCallStatus as callStatusHandler } from '../lib/call-status.js';

const ENV_KEYS=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','KV_REST_API_URL','KV_REST_API_TOKEN','RESEND_API_KEY','OWNER_EMAILS'];
function withEnv(values, fn) {
  const prior=Object.fromEntries(ENV_KEYS.map((key)=>[key,process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
  return Promise.resolve(fn()).finally(()=>{ for (const key of ENV_KEYS) { if (prior[key]===undefined) delete process.env[key]; else process.env[key]=prior[key]; } });
}
function responseRecorder() {
  return { statusCode:200, body:null, ended:false,
    status(code){this.statusCode=code;return this;}, json(value){this.body=value;return this;},
    end(){this.ended=true;return this;} };
}
function twilioSignature(context, body, token) {
  let payload=`https://trystellarai.com/api/broadcast?jarvisCallStatus=1&context=${encodeURIComponent(context)}`;
  for (const key of Object.keys(body).sort()) payload+=`${key}${body[key]}`;
  return createHmac('sha1',token).update(payload).digest('base64');
}

test('Twilio health is not ready when call-context storage is missing', async()=>withEnv({
  TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32), TWILIO_AUTH_TOKEN:'secret',
  TWILIO_FROM_NUMBER:'+441234567890', OWNER_PHONE:'+447700900123'
},()=>{
  const config=getOwnerCallConfiguration();
  assert.equal(config.twilioCredentialsConfigured,true); assert.equal(config.callStorageConfigured,false);
  assert.equal(config.twilioConfigured,false);
}));
test('failed Twilio callback sends one owner fallback email', async()=>withEnv({
  TWILIO_AUTH_TOKEN:'twilio-secret', KV_REST_API_URL:'https://kv.test', KV_REST_API_TOKEN:'token',
  RESEND_API_KEY:'resend', OWNER_EMAILS:'owner@example.com'
},async()=>{
  const calls=[]; const priorFetch=global.fetch;
  global.fetch=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('/pipeline')) {
      const cmd=JSON.parse(options.body)[0];
      if(cmd[0]==='GET') return {ok:true,json:async()=>[{result:JSON.stringify({fallback:{category:'security',severity:'critical',summary:'Test alert'}})}]};
      if(cmd[0]==='SET') return {ok:true,json:async()=>[{result:'OK'}]};
    }
    if(String(url).includes('resend.com')) return {ok:true,json:async()=>({id:'mail_1'})};
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    const context='11111111-1111-4111-8111-111111111111', body={CallStatus:'failed'};
    const req={method:'POST',query:{context},body,headers:{'x-twilio-signature':twilioSignature(context,body,'twilio-secret')}};
    const res=responseRecorder(); await callStatusHandler(req,res);
    assert.equal(res.statusCode,200); assert.equal(res.body?.fallback,'email');
    assert.equal(calls.filter((call)=>call.url.includes('resend.com')).length,1);
  } finally { global.fetch=priorFetch; }
}));

test('failed fallback delivery releases claim so Twilio retry can send', async()=>withEnv({
  TWILIO_AUTH_TOKEN:'twilio-secret', KV_REST_API_URL:'https://kv.test', KV_REST_API_TOKEN:'token',
  RESEND_API_KEY:'resend', OWNER_EMAILS:'owner@example.com'
},async()=>{
  let claimed=false, resendAttempts=0; const priorFetch=global.fetch;
  global.fetch=async(url,options={})=>{
    if(String(url).includes('/pipeline')) {
      const cmd=JSON.parse(options.body)[0];
      if(cmd[0]==='GET') return {ok:true,json:async()=>[{result:JSON.stringify({fallback:{category:'security',severity:'critical',summary:'Retry alert'}})}]};
      if(cmd[0]==='SET') { if(claimed) return {ok:true,json:async()=>[{result:null}]}; claimed=true; return {ok:true,json:async()=>[{result:'OK'}]}; }
      if(cmd[0]==='DEL') { claimed=false; return {ok:true,json:async()=>[{result:1}]}; }
    }
    if(String(url).includes('resend.com')) { resendAttempts+=1; return {ok:resendAttempts>1,json:async()=>({})}; }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    const context='22222222-2222-4222-8222-222222222222', body={CallStatus:'failed'};
    const req={method:'POST',query:{context},body,headers:{'x-twilio-signature':twilioSignature(context,body,'twilio-secret')}};
    const first=responseRecorder(); await callStatusHandler(req,first); assert.equal(first.statusCode,502); assert.equal(claimed,false);
    const second=responseRecorder(); await callStatusHandler(req,second); assert.equal(second.statusCode,200); assert.equal(second.body?.fallback,'email');
    assert.equal(resendAttempts,2);
  } finally { global.fetch=priorFetch; }
}));
