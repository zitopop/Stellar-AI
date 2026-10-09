function authHeaders(token,extra={}){
  return {Authorization:'Bearer '+token,...extra};
}
function safeUrl(value){
  try{
    const url=new URL(String(value||''));
    return ['https:','http:'].includes(url.protocol)?url.toString():'';
  }catch{return ''}
}
async function githubRequest(token,path){
  const response=await fetch('https://api.github.com'+path,{
    headers:authHeaders(token,{
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'Stellar-AI-Plugin',
    }),
    signal:AbortSignal.timeout(12000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.message||'GitHub rejected this token.');
  return {data,response};
}
async function vercelRequest(token,path){
  const response=await fetch('https://api.vercel.com'+path,{
    headers:authHeaders(token),
    signal:AbortSignal.timeout(12000),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||data?.message||'Vercel rejected this token.');
  return data;
}

function gmailPair(){
  if(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET)return [process.env.GMAIL_CLIENT_ID,process.env.GMAIL_CLIENT_SECRET];
  if(process.env.GOOGLE_OAUTH_CLIENT_ID&&process.env.GOOGLE_OAUTH_CLIENT_SECRET)return [process.env.GOOGLE_OAUTH_CLIENT_ID,process.env.GOOGLE_OAUTH_CLIENT_SECRET];
  return ['', ''];
}
function gmailClientId(){return String(gmailPair()[0]||'').trim();}
function gmailClientSecret(){return String(gmailPair()[1]||'').trim();}
async function gmailAccessToken(refreshToken){
  const clientId=gmailClientId();
  if(!clientId)throw new Error('Gmail OAuth client id is not configured.');
  const body=new URLSearchParams({client_id:clientId,refresh_token:String(refreshToken||'').trim(),grant_type:'refresh_token'});
  const secret=gmailClientSecret();
  if(secret)body.set('client_secret',secret);
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token)throw new Error(data?.error_description||data?.error||'Gmail rejected this refresh token.');
  return String(data.access_token);
}
async function gmailRequest(refreshToken,path){
  const accessToken=await gmailAccessToken(refreshToken);
  const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me'+path,{headers:authHeaders(accessToken),signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||'Gmail rejected this token.');
  return data;
}


async function gmailInboxItems(refreshToken){
  // One refresh per request. Never expose the OAuth token or whole message bodies.
  const accessToken=await gmailAccessToken(refreshToken);
  async function get(path){
    const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me'+path,{
      headers:authHeaders(accessToken),
      signal:AbortSignal.timeout(12000),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.error?.message||'Gmail could not read the inbox.');
    return data;
  }
  const list=await get('/messages?labelIds=INBOX&maxResults=6');
  const ids=(Array.isArray(list?.messages)?list.messages:[])
    .map(message=>String(message?.id||'')).filter(id=>/^[a-zA-Z0-9_-]{5,128}$/.test(id)).slice(0,6);
  const messages=await Promise.all(ids.map(async id=>{
    const data=await get('/messages/'+encodeURIComponent(id)+'?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date');
    const headers=Array.isArray(data?.payload?.headers)?data.payload.headers:[];
    const header=name=>String(headers.find(item=>String(item?.name||'').toLowerCase()===name)?.value||'').slice(0,160);
    return {
      id,
      name:header('subject')||'(No subject)',
      detail:[header('from'),header('date')].filter(Boolean).join(' · ').slice(0,250),
      url:'https://mail.google.com/mail/u/0/#inbox',
    };
  }));
  return messages;
}


export async function verifyProviderToken(id,token){
  if(id==='github'){
    const {data,response}=await githubRequest(token,'/user');
    return {
      account:{
        label:String(data?.login||'GitHub account').slice(0,100),
        detail:String(data?.name||data?.html_url||'').slice(0,160),
        url:safeUrl(data?.html_url),
      },
      scopes:String(response.headers.get('x-oauth-scopes')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,30),
    };
  }
  if(id==='vercel'){
    const data=await vercelRequest(token,'/v2/user');
    const user=data?.user||data;
    return {
      account:{
        label:String(user?.username||user?.name||user?.email||'Vercel account').slice(0,100),
        detail:String(user?.email||user?.name||'').slice(0,160),
        url:'',
      },
      scopes:[],
    };
  }
  if(id==='gmail'){
    const data=await gmailRequest(token,'/profile');
    return {
      account:{
        label:String(data?.emailAddress||'Gmail account').slice(0,100),
        detail:'Gmail inbox alerts connected',
        url:'',
      },
      scopes:['gmail.readonly'],
    };
  }
  throw new Error('This plugin does not support token connection.');
}

export async function inspectProvider(id,token){
  if(id==='github'){
    const {data}=await githubRequest(token,'/user/repos?per_page=12&sort=updated&affiliation=owner,collaborator,organization_member');
    const items=(Array.isArray(data)?data:[]).slice(0,12).map(repo=>({
      id:String(repo?.id||repo?.full_name||''),
      name:String(repo?.full_name||repo?.name||'Repository').slice(0,140),
      detail:[repo?.private?'Private':'Public',repo?.language||'',repo?.default_branch?'Branch: '+repo.default_branch:''].filter(Boolean).join(' · '),
      url:safeUrl(repo?.html_url),
    }));
    return {title:'Recent GitHub repositories',items};
  }
  if(id==='vercel'){
    const data=await vercelRequest(token,'/v9/projects?limit=12');
    const items=(Array.isArray(data?.projects)?data.projects:[]).slice(0,12).map(project=>({
      id:String(project?.id||project?.name||''),
      name:String(project?.name||'Vercel project').slice(0,140),
      detail:[project?.framework||'',project?.latestDeployments?.[0]?.readyState||''].filter(Boolean).join(' · '),
      url:project?.name?'https://vercel.com/dashboard/project/'+encodeURIComponent(project.name):'',
    }));
    return {title:'Vercel projects',items};
  }
  if(id==='gmail'){
    const items=await gmailInboxItems(token);
    return {title:'Recent Gmail inbox messages (read-only)',items};
  }
  throw new Error('This plugin does not support inspection yet.');
}
