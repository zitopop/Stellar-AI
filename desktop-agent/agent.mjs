#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BASE_URL=(process.env.STELLAR_DESKTOP_URL||'https://trystellarai.com').replace(/\/$/,'');
const CONFIG_PATH=process.env.STELLAR_DESKTOP_CONFIG||path.join(os.homedir(),'.stellar-desktop.json');
const DEFAULT_ROOT=path.join(os.homedir(),'StellarWorkspace');
const LOCAL_STOP_PATH=path.join(os.homedir(),'.stellar-desktop-stop');
const BLOCKED_PATH_NAMES=new Set(['.ssh','.gnupg','.aws','.azure','.kube','credentials','credential','cookies','cookie','login data','wallet','wallets','keychain','keychains','vault','.npmrc','.git-credentials','id_rsa','id_ed25519']);
const BLOCKED_COMMAND_PARTS=['diskpart','bcdedit','restart-computer','stop-computer','vssadmin delete','wbadmin delete','reg delete','net user','sc config','sc delete','set-mppreference','add-mppreference','disable-realtimemonitoring','takeown','icacls','cipher /w'];
function isBlockedPath(value){
  const parts=String(value||'').replace(/\\/g,'/').toLowerCase().split('/').filter(Boolean);
  return parts.some(part=>BLOCKED_PATH_NAMES.has(part)||part==='.env'||part.startsWith('.env.'));
}
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
function isBlockedCommand(value){
  const c=String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
  if(BLOCKED_COMMAND_PARTS.some(part=>c.includes(part)))return true;
  if(c.startsWith('format ')||c==='format')return true;
  if(c.startsWith('shutdown ')||c==='shutdown')return true;
  if(c.includes('remove-item')&&c.includes('-recurse')&&c.includes('-force'))return true;
  if((c.includes('del ')||c.includes('rd ')||c.includes('rmdir '))&&(c.includes('/s')||c.includes('/q')))return true;
  if(c.includes('rm -rf'))return true;
  if(c.includes('powershell')&&(c.includes('-enc ')||c.includes('-encodedcommand')))return true;
  if(/(?:\bprintenv\b|\bgh\s+auth\s+token\b|\bgit\s+credential\b|\bvercel\s+env\s+pull\b|\bget-childitem\s+env:|\bgci\s+env:|\bdir\s+env:|\bcmd(?:\.exe)?\s+\/c\s+set\b)/i.test(c))return true;
  return false;
}
const ALLOW_SHELL=String(process.env.STELLAR_DESKTOP_ALLOW_SHELL||'').toLowerCase()==='1'
  || String(process.env.STELLAR_DESKTOP_ALLOW_SHELL||'').toLowerCase()==='true';

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function request(route,body,headers={}){
  const response=await fetch(`${BASE_URL}${route}`,{
    method:'POST',
    headers:{'content-type':'application/json',...headers},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(30000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data?.error||`Request failed (${response.status})`);
  return data;
}
async function loadConfig(){
  try{return JSON.parse(await fsp.readFile(CONFIG_PATH,'utf8'))}
  catch{throw new Error(`Not paired. Run: node agent.mjs pair YOUR_CODE`)}
}
async function saveConfig(config){
  await fsp.mkdir(path.dirname(CONFIG_PATH),{recursive:true});
  await fsp.writeFile(CONFIG_PATH,JSON.stringify(config,null,2),{mode:0o600});
}
function headers(config){
  return {'x-stellar-device-id':config.deviceId,'x-stellar-device-token':config.deviceToken};
}
function workspaceRoot(config){
  return path.resolve(process.env.STELLAR_DESKTOP_ROOT||config.workspaceRoot||DEFAULT_ROOT);
}
function safePath(config,input=''){
  const root=workspaceRoot(config);
  const target=path.resolve(root,String(input||'.'));
  const relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw new Error('Path is outside the paired workspace root.');
  if(isBlockedPath(relative)) throw new Error('Credential, key, browser-secret, and environment-secret files are blocked.');
  return {root,target,relative:relative||'.'};
}
async function ensureRoot(config){await fsp.mkdir(workspaceRoot(config),{recursive:true})}
async function localStopped(){try{await fsp.access(LOCAL_STOP_PATH);return true}catch{return false}}
async function localAudit(config,event,detail={}){try{const line=JSON.stringify({at:new Date().toISOString(),event,...detail})+'\\n';await fsp.appendFile(path.join(workspaceRoot(config),'.stellar-audit.jsonl'),line,'utf8')}catch{}}
function cap(value,max=120000){
  const text=String(value??'');
  return text.length>max?text.slice(0,max)+'\n[output truncated]':text;
}
function runProcess(command,{cwd,timeoutMs=120000}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,{cwd,shell:true,windowsHide:true,env:process.env});
    let stdout='',stderr='',settled=false;
    const timer=setTimeout(()=>{if(!settled){settled=true;child.kill();reject(new Error('Command timed out.'))}},timeoutMs);
    child.stdout?.on('data',d=>stdout=cap(stdout+d));
    child.stderr?.on('data',d=>stderr=cap(stderr+d));
    child.on('error',err=>{clearTimeout(timer);if(!settled){settled=true;reject(err)}});
    child.on('close',code=>{clearTimeout(timer);if(!settled){settled=true;resolve({code,stdout:cap(stdout),stderr:cap(stderr)})}});
  });
}
async function execute(config,task){
  const args=task?.args||{};
  switch(task?.type){
    case 'read_file': {
      const {target,relative}=safePath(config,args.path);
      const stat=await fsp.stat(target);
      if(!stat.isFile()) throw new Error('Target is not a file.');
      if(stat.size>1_000_000) throw new Error('File is larger than the 1 MB desktop-agent read limit.');
      return `FILE ${relative}\n${await fsp.readFile(target,'utf8')}`;
    }
    case 'list_directory': {
      const {target,relative}=safePath(config,args.path);
      const entries=(await fsp.readdir(target,{withFileTypes:true})).slice(0,250)
        .map(e=>`${e.isDirectory()?'[dir] ':'[file]'}${e.name}`);
      return `DIRECTORY ${relative}\n${entries.join('\n')}`;
    }
    case 'mkdir': {
      if(task.approved!==true) throw new Error('mkdir was not approved.');
      const {target,relative}=safePath(config,args.path);
      await fsp.mkdir(target,{recursive:true});
      return `Created directory: ${relative}`;
    }
    case 'write_file': {
      if(task.approved!==true) throw new Error('write_file was not approved.');
      const {root,target,relative}=safePath(config,args.path);
      const content=String(args.content??'');
      if(content.length>2_000_000) throw new Error('Write exceeds the 2 MB desktop-agent limit.');
      await fsp.mkdir(path.dirname(target),{recursive:true});
      try{
        const old=await fsp.readFile(target);
        const backupDir=path.join(root,'.stellar-backups');
        await fsp.mkdir(backupDir,{recursive:true});
        const safeName=relative.replace(/[\\/:*?"<>|]/g,'_');
        await fsp.writeFile(path.join(backupDir,`${Date.now()}-${safeName}`),old);
      }catch(error){if(error?.code!=='ENOENT') throw error}
      const temp=`${target}.stellar-tmp-${process.pid}`;
      await fsp.writeFile(temp,content,'utf8');
      await fsp.rename(temp,target);
      return `Wrote file: ${relative} (${Buffer.byteLength(content)} bytes)`;
    }
    case 'run_command': {
      if(task.approved!==true) throw new Error('run_command was not approved.');
      if(!ALLOW_SHELL) throw new Error('Shell execution is disabled. Start with STELLAR_DESKTOP_ALLOW_SHELL=1 after reviewing the command.');
      const command=String(args.command||'').trim();
      if(!command) throw new Error('Command is empty.');
      if(command.length>4000) throw new Error('Command is too long.');
      if(isBlockedCommand(command)) throw new Error('Command blocked by local Stellar safeguards.');
      const cwd=safePath(config,args.cwd||'.').target;
      const result=await runProcess(command,{cwd});
      return `EXIT ${result.code}\nSTDOUT\n${result.stdout}\nSTDERR\n${result.stderr}`;
    }
    case 'open_url': {
      if(task.approved!==true) throw new Error('open_url was not approved.');
      const url=new URL(String(args.url||''));
      if(!['https:','http:'].includes(url.protocol)) throw new Error('Only http/https URLs can be opened.');
      const escaped=url.toString().replace(/'/g,"''");
      const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Start-Process '${escaped}'`],{windowsHide:true,detached:true,stdio:'ignore'});
      child.unref();
      return `Opened URL: ${url.toString()}`;
    }
    default: throw new Error('Unsupported desktop action.');
  }
}
async function report(config,taskId,payload){
  const safePayload={...payload};
  if('output' in safePayload)safePayload.output=redactSensitive(safePayload.output);
  if('error' in safePayload)safePayload.error=redactSensitive(safePayload.error);
  try{await request('/api/desktop-agent',{action:'report',taskId,...safePayload},headers(config))}
  catch(error){console.error('Could not report task result:',error.message)}
}
async function pair(code){
  const clean=String(code||'').replace(/[^A-Z0-9]/gi,'').toUpperCase();
  if(!clean) throw new Error('Pairing code required.');
  const data=await request('/api/desktop-agent',{action:'claimPair',code:clean,hostname:os.hostname(),platform:`${process.platform}/${process.arch}`});
  const config={deviceId:data.deviceId,deviceToken:data.deviceToken,hostname:data.hostname||os.hostname(),workspaceRoot:DEFAULT_ROOT,pairedAt:new Date().toISOString()};
  await saveConfig(config);
  await ensureRoot(config);
  console.log('Paired with Stellar AI.');
  console.log('Workspace:',workspaceRoot(config));
  console.log('Shell commands:',ALLOW_SHELL?'enabled':'disabled by default');
}
async function run(){
  const config=await loadConfig();
  await ensureRoot(config);
  console.log(`Stellar Desktop Agent online on ${config.hostname||os.hostname()}`);
  console.log(`Workspace: ${workspaceRoot(config)}`);
  console.log(`Shell: ${ALLOW_SHELL?'ENABLED':'disabled (safer default)'}`);
  let backoff=1500;
  while(true){
    try{
      if(await localStopped()){await sleep(1800);continue}
      const data=await request('/api/desktop-agent',{action:'poll'},headers(config));
      backoff=1500;
      if(data.stopped){await sleep(1800);continue}
      if(!data.task){await sleep(1800);continue}
      const task=data.task;
      console.log(`→ ${task.type} ${task.id}`);
      try{
        const output=await execute(config,task);
        console.log(`✓ ${task.type}`);
        await localAudit(config,'task_completed',{taskId:task.id,type:task.type});
        await report(config,task.id,{ok:true,output});
      }catch(error){
        console.error(`✗ ${task.type}: ${error.message}`);
        await localAudit(config,'task_failed',{taskId:task.id,type:task.type,error:String(error.message).slice(0,300)});
        await report(config,task.id,{ok:false,error:error.message});
      }
    }catch(error){
      console.error('Connection:',error.message);
      await sleep(backoff);
      backoff=Math.min(15000,Math.round(backoff*1.6));
    }
  }
}
async function stopLocal(){await fsp.writeFile(LOCAL_STOP_PATH,'stopped\\n','utf8');console.log('Local Emergency Stop enabled. The agent will not accept tasks until resumed.')}
async function resumeLocal(){try{await fsp.unlink(LOCAL_STOP_PATH)}catch(error){if(error?.code!=='ENOENT')throw error}console.log('Local Emergency Stop cleared.')}
async function selfTest(){
  const config={workspaceRoot:DEFAULT_ROOT};
  await ensureRoot(config);
  const dir='StellarAgentSelfTest';
  const file=dir+'/hello.txt';
  const first='Stellar PC Agent self-test: write/read/list passed.\n';
  const second='Stellar PC Agent self-test: backup + rewrite passed.\n';
  const created=await execute(config,{type:'mkdir',args:{path:dir},approved:true});
  const wrote1=await execute(config,{type:'write_file',args:{path:file,content:first},approved:true});
  const read1=await execute(config,{type:'read_file',args:{path:file},approved:true});
  const listed=await execute(config,{type:'list_directory',args:{path:dir},approved:true});
  const wrote2=await execute(config,{type:'write_file',args:{path:file,content:second},approved:true});
  const read2=await execute(config,{type:'read_file',args:{path:file},approved:true});
  const backupDir=path.join(workspaceRoot(config),'.stellar-backups');
  let backupCount=0;
  try{backupCount=(await fsp.readdir(backupDir)).filter(name=>name.includes('StellarAgentSelfTest_hello.txt')).length}catch{}
  const passed=read1.includes(first.trim())&&read2.includes(second.trim())&&backupCount>0;
  await localAudit(config,'self_test',{passed,backupCount});
  console.log(JSON.stringify({
    passed,
    workspaceRoot:workspaceRoot(config),
    testFile:file,
    backupCount,
    checks:{create:created,write:wrote1,list:listed,rewrite:wrote2},
    message:passed?'Stellar Desktop local self-test passed.':'Self-test did not complete every check.'
  },null,2));
  if(!passed)process.exitCode=1;
}
async function status(){
  const config=await loadConfig();
  console.log(JSON.stringify({
    paired:true,
    deviceId:config.deviceId,
    hostname:config.hostname,
    baseUrl:BASE_URL,
    workspaceRoot:workspaceRoot(config),
    shellEnabled:ALLOW_SHELL,
    localEmergencyStop:await localStopped(),
    configPath:CONFIG_PATH,
  },null,2));
}

const [command,arg]=process.argv.slice(2);
try{
  if(command==='pair') await pair(arg);
  else if(command==='run'||command==='start') await run();
  else if(command==='status') await status();
  else if(command==='stop') await stopLocal();
  else if(command==='resume') await resumeLocal();
  else if(command==='selftest') await selfTest();
  else{
    console.log('Stellar Desktop Agent');
    console.log('  node agent.mjs pair PAIRING_CODE');
    console.log('  node agent.mjs run');
    console.log('  node agent.mjs status');
    console.log('  node agent.mjs stop');
    console.log('  node agent.mjs resume');
    console.log('  node agent.mjs selftest');
    console.log('');
    console.log('Optional: set STELLAR_DESKTOP_ROOT to choose the allowed workspace folder.');
    console.log('Optional: set STELLAR_DESKTOP_ALLOW_SHELL=1 to permit explicitly-approved terminal commands.');
  }
}catch(error){
  console.error(error.message);
  process.exitCode=1;
}
