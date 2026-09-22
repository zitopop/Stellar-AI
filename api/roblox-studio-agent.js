import robloxStudioAgentHandler from '../lib/roblox-studio-agent-handler.js';
import robloxStudioPlanHandler from '../lib/roblox-studio-plan-handler.js';

export default async function handler(req,res){
  const action=String(req.query?.action||req.body?.action||'').trim();
  if(action==='plan') return robloxStudioPlanHandler(req,res);
  return robloxStudioAgentHandler(req,res);
}
