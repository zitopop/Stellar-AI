import desktopAgentHandler from '../lib/desktop-agent-handler.js';
import desktopPlanHandler from '../lib/desktop-plan-handler.js';
import pluginManagerHandler from '../lib/plugin-manager-handler.js';
import robloxStudioAgentHandler from '../lib/roblox-studio-agent-handler.js';
import robloxStudioPlanHandler from '../lib/roblox-studio-plan-handler.js';
import jarvisMissionHandler from '../lib/jarvis-mission-handler.js';

export default async function handler(req,res){
  const surface=String(req.query?.surface||'').trim();
  const action=String(req.query?.action||req.body?.action||'').trim();

  if(surface==='jarvis') return jarvisMissionHandler(req,res);

  if(surface==='plugins') return pluginManagerHandler(req,res);

  if(surface==='roblox-studio'){
    if(action==='plan') return robloxStudioPlanHandler(req,res);
    return robloxStudioAgentHandler(req,res);
  }

  if(action==='plan') return desktopPlanHandler(req,res);
  return desktopAgentHandler(req,res);
}
