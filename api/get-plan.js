// api/get-plan.js — retrieves the signed-in user's plan and wallet
import { requireSession } from './_auth.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Account storage is not configured.' });

  try {
    const key = `stellar:user:${session.email}`;
    const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Database read failed');
    const result = (await response.json()).result;
    const user = result ? JSON.parse(result) : {};
    return res.status(200).json({
      plan: user.plan === 'lite' || user.plan === 'pro' ? user.plan : 'free',
      walletPence: Math.max(0, Number(user.walletPence) || 0),
      updatedAt: user.updatedAt || null,
    });
  } catch {
    return res.status(500).json({ error: 'Could not load your plan right now.' });
  }
}
