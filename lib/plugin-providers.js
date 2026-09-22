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
  throw new Error('This plugin does not support inspection yet.');
}
