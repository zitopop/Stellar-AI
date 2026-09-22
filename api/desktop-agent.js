import desktopAgentHandler from '../lib/desktop-agent-handler.js';
import desktopPlanHandler from '../lib/desktop-plan-handler.js';

export default async function handler(req,res){
  const action=String(req.query?.action||req.body?.action||'').trim();
  if(action==='plan') return desktopPlanHandler(req,res);
  return desktopAgentHandler(req,res);
}
