import { createPaperPortfolio, paperTrade, classifyMoneyAction } from '../lib/jarvis-money.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  const body = req.body || {};
  const action = body.action || {};
  const policy = classifyMoneyAction(action);
  if (!policy.executable) return res.status(202).json({ ok: false, status: policy.level, approvalRequired: policy.level === 'APPROVAL_REQUIRED', reason: policy.reason });
  if (String(action.type).toLowerCase() === 'paper_trade') {
    try {
      const portfolio = paperTrade(createPaperPortfolio(body.portfolio), action.order || {});
      return res.status(200).json({ ok: true, mode: 'paper', portfolio });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  }
  return res.status(200).json({ ok: true, status: 'READY', action: action.type, note: 'Safe no-spend action accepted. External data/tools must provide verified facts.' });
}
