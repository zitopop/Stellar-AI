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

function gmailClientId(){return String(process.env.GMAIL_CLIENT_ID||process.env.GOOGLE_OAUTH_CLIENT_ID||'').trim();}
function gmailClientSecret(){return String(process.env.GMAIL_CLIENT_SECRET||process.env.GOOGLE_OAUTH_CLIENT_SECRET||'').trim();}
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
    const data=await gmailRequest(token,'/profile');
    const items=[{id:'gmail-profile',name:String(data?.emailAddress||'Gmail account').slice(0,140),detail:'Messages: '+String(data?.messagesTotal??'unknown')+' · Threads: '+String(data?.threadsTotal??'unknown'),url:''}];
    return {title:'Gmail connection',items};
  }
  throw new Error('This plugin does not support inspection yet.');
}
