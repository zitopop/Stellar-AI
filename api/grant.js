// api/grant.js — owner-only account, credit, and gift-code actions
import crypto from 'crypto';
import { isOwnerEmail, requireSession } from './_auth.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

async function kv(url, token, pipeline) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pipeline),
  });
  if (!response.ok) throw new Error('Database write failed');
  return response.json();
}

async function kvGet(url, token, key) {
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Database read failed');
  const data = await response.json();
  try { return data.result ? JSON.parse(data.result) : null; } catch { return null; }
}

async function kvKeys(url, token, pattern) {
  const response = await fetch(`${url}/scan/0?match=${encodeURIComponent(pattern)}&count=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Database scan failed');
  const data = await response.json();
  return data.result?.[1] || [];
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validPlan(plan) {
  return ['free', 'lite', 'pro'].includes(plan);
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Owner access is required.' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Account storage is not configured.' });

  const { action, email, plan, amount, codeAmount, walletPence, creditMode } = req.body || {};
  const normalizedEmail = String(email || '').toLowerCase().trim();

  try {
    if (action === 'createCode') {
      const pence = Math.round(Number(codeAmount));
      if (!Number.isFinite(pence) || pence < 1 || pence > 100000) {
        return res.status(400).json({ error: 'Enter a gift-code amount from £0.01 to £1,000.' });
      }
      const code = `STELLAR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      await kv(url, token, [['SET', `stellar:code:${code}`, JSON.stringify({ amount: pence, used: false, createdAt: Date.now(), createdBy: session.email })]]);
      return res.status(200).json({ ok: true, code, amount: pence });
    }

    if (action === 'giveAllWelcomeCredit') {
      const authKeys = await kvKeys(url, token, 'stellar:auth:*');
      let credited = 0;
      let skipped = 0;
      for (const authKey of authKeys) {
        const userEmail = authKey.replace('stellar:auth:', '');
        const userKey = `stellar:user:${userEmail}`;
        const user = (await kvGet(url, token, userKey)) || { plan: 'free', createdAt: Date.now() };
        if (user.welcomeCreditGiven) { skipped += 1; continue; }
        user.walletPence = Math.max(0, Number(user.walletPence) || 0) + 100;
        user.welcomeCreditGiven = true;
        user.welcomeCreditAt = Date.now();
        user.updatedAt = Date.now();
        await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
        credited += 1;
      }
      return res.status(200).json({ ok: true, total: authKeys.length, credited, skipped });
    }

    if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Enter a valid account email.' });
    const userKey = `stellar:user:${normalizedEmail}`;
    const user = (await kvGet(url, token, userKey)) || { plan: 'free', walletPence: 0, createdAt: Date.now() };

    if (action === 'addCredit' || action === 'removeCredit') {
      const pence = Math.round(Number(amount) * 100);
      if (!Number.isFinite(pence) || pence < 1 || pence > 100000) return res.status(400).json({ error: 'Enter a credit amount from £0.01 to £1,000.' });
      user.walletPence = action === 'addCredit'
        ? Math.max(0, Number(user.walletPence) || 0) + pence
        : Math.max(0, (Number(user.walletPence) || 0) - pence);
    } else {
      if (plan !== undefined) {
        if (!validPlan(plan)) return res.status(400).json({ error: 'Invalid plan.' });
        user.plan = plan;
        user.planGranted = true;
        user.planGrantedAt = Date.now();
      }
      if (walletPence !== undefined) {
        const pence = Math.round(Number(walletPence));
        if (!Number.isFinite(pence) || pence < 0 || pence > 100000) return res.status(400).json({ error: 'Invalid credit amount.' });
        const current = Math.max(0, Number(user.walletPence) || 0);
        user.walletPence = creditMode === 'remove' ? Math.max(0, current - pence)
          : creditMode === 'set' ? pence : current + pence;
      }
      if (plan === undefined && walletPence === undefined) return res.status(400).json({ error: 'Choose a plan or credit amount.' });
    }

    user.updatedAt = Date.now();
    await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
    return res.status(200).json({ ok: true, email: normalizedEmail, plan: user.plan, walletPence: user.walletPence });
  } catch (error) {
    console.error('Owner grant error', error?.message || error);
    return res.status(500).json({ error: 'Could not complete that owner action.' });
  }
}
