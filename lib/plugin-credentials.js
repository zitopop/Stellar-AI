import crypto from 'crypto';

const KV_URL=process.env.KV_REST_API_URL;
const KV_TOKEN=process.env.KV_REST_API_TOKEN;
const CREDENTIAL_TTL_SECONDS=60*60*24*365;

function accountKey(email){
  return crypto.createHash('sha256').update(String(email||'').trim().toLowerCase()).digest('hex');
}
function credentialKey(email,id){return `stellar:plugin-secret:${accountKey(email)}:${String(id||'').trim()}`;}
function encryptionKey(){
  const material=process.env.PLUGIN_TOKEN_ENCRYPTION_KEY||process.env.AUTH_SESSION_SECRET||process.env.OWNER_SECRET||'';
  if(!material)throw new Error('Plugin credential encryption is not configured.');
  return crypto.createHash('sha256').update(`stellar-plugin-credentials-v1:${material}`).digest();
}
async function redis(command,...args){
  if(!KV_URL||!KV_TOKEN)throw new Error('Plugin credential storage is not configured.');
  const path=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const response=await fetch(`${KV_URL}/${path}`,{
    headers:{Authorization:`Bearer ${KV_TOKEN}`},
    signal:AbortSignal.timeout(8000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error||`Storage command ${command} failed.`);
  return data?.result;
}
function encrypt(value){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  return JSON.stringify({
    v:1,
    iv:iv.toString('base64url'),
    tag:cipher.getAuthTag().toString('base64url'),
    data:ciphertext.toString('base64url'),
  });
}
function decrypt(payload){
  const parsed=JSON.parse(String(payload||'{}'));
  if(parsed?.v!==1||!parsed.iv||!parsed.tag||!parsed.data)throw new Error('Stored plugin credential is invalid.');
  const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(parsed.iv,'base64url'));
  decipher.setAuthTag(Buffer.from(parsed.tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(parsed.data,'base64url')),decipher.final()]).toString('utf8');
}
export function pluginCredentialStorageReady(){
  return Boolean(KV_URL&&KV_TOKEN&&(process.env.PLUGIN_TOKEN_ENCRYPTION_KEY||process.env.AUTH_SESSION_SECRET||process.env.OWNER_SECRET));
}
export async function storePluginCredential(email,id,token){
  const value=String(token||'').trim();
  if(!value||value.length<8||value.length>4096)throw new Error('Plugin token is missing or invalid.');
  await redis('set',credentialKey(email,id),encrypt(value));
  await redis('expire',credentialKey(email,id),CREDENTIAL_TTL_SECONDS);
}
export async function readPluginCredential(email,id){
  const raw=await redis('get',credentialKey(email,id));
  if(!raw)return '';
  return decrypt(raw);
}
export async function hasPluginCredential(email,id){
  if(!pluginCredentialStorageReady())return false;
  return Boolean(await redis('get',credentialKey(email,id)));
}
export async function deletePluginCredential(email,id){
  if(!pluginCredentialStorageReady())return;
  await redis('del',credentialKey(email,id));
}
