// api/grant.js — owner tools: grant plans, give credit, create gift codes
import crypto from 'crypto';

function kv(url, token, pipeline) {
  return fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(pipeline),
  }).then(r => r.json());
}

async function kvGet(url, token, key) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}

async function kvKeys(url, token, pattern) {
  // Use SCAN to get all keys matching pattern
  const r = await fetch(`${url}/scan/0?match=${encodeURIComponent(pattern)}&count=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = await r.json();
  return d.result ? d.result[1] : [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin?.includes('trystellarai.com') ? req.headers.origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'DB not connected' });

  const { action, email, plan, amount, secret, key, code, codeAmount, walletPence, creditMode } = req.body || {};

  // Verify owner
  const ownerKey = secret || key;
  if (!ownerKey || ownerKey !== process.env.OWNER_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const em = String(email || '').toLowerCase().trim();

  // ── GRANT PLAN ──
  if (action === 'grantPlan') {
    if (!em || !plan) return res.status(400).json({ error: 'Missing email or plan' });
    const userKey = `stellar:user:${em}`;
    const user = await kvGet(url, token, userKey) || {};
    user.plan = plan;
    user.planGranted = true;
    user.planGrantedAt = Date.now();
    await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
    return res.status(200).json({ ok: true, email: em, plan });
  }

  // ── ADD CREDIT ──
  if (action === 'addCredit') {
    if (!em || !amount) return res.status(400).json({ error: 'Missing email or amount' });
    const userKey = `stellar:user:${em}`;
    const user = await kvGet(url, token, userKey) || {};
    user.promoBalance = (user.promoBalance || 0) + Math.round(Number(amount) * 100);
    await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
    return res.status(200).json({ ok: true, email: em, balance: user.promoBalance });
  }

  // ── REMOVE CREDIT ──
  if (action === 'removeCredit') {
    if (!em || !amount) return res.status(400).json({ error: 'Missing email or amount' });
    const userKey = `stellar:user:${em}`;
    const user = await kvGet(url, token, userKey) || {};
    user.promoBalance = Math.max(0, (user.promoBalance || 0) - Math.round(Number(amount) * 100));
    await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
    return res.status(200).json({ ok: true, email: em, balance: user.promoBalance });
  }

  // ── GIVE £1 TO ALL EXISTING USERS (one-time retroactive) ──
  if (action === 'giveAllWelcomeCredit') {
    // Get all auth keys to find all users
    const authKeys = await kvKeys(url, token, 'stellar:auth:*');
    const results = [];
    const WELCOME_CREDIT = 100; // 100 units = £1

    for (const authKey of authKeys) {
      try {
        const emailFromKey = authKey.replace('stellar:auth:', '');
        const userKey = `stellar:user:${emailFromKey}`;
        const user = await kvGet(url, token, userKey) || {};

        // Only add if they haven't received welcome credit yet
        if (!user.welcomeCreditGiven) {
          user.promoBalance = (user.promoBalance || 0) + WELCOME_CREDIT;
          user.welcomeCreditGiven = true;
          user.welcomeCreditAt = Date.now();
          if (!user.plan) user.plan = 'free';
          await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
          results.push({ email: emailFromKey, credited: true, newBalance: user.promoBalance });
        } else {
          results.push({ email: emailFromKey, credited: false, reason: 'already received' });
        }
      } catch (e) {
        results.push({ key: authKey, error: e.message });
      }
    }

    return res.status(200).json({
      ok: true,
      total: authKeys.length,
      credited: results.filter(r => r.credited).length,
      skipped: results.filter(r => !r.credited).length,
      results
    });
  }

  // ── CREATE GIFT CODE ──
  if (action === 'createCode') {
    const amt = Math.round(Number(codeAmount || 100));
    const code = 'STELLAR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const codeKey = `stellar:code:${code}`;
    await kv(url, token, [['SET', codeKey, JSON.stringify({ amount: amt, used: false, createdAt: Date.now() })]]);
    return res.status(200).json({ ok: true, code, amount: amt });
  }

  // Handle credit mode from app (add/remove/set walletPence)
  if (creditMode && email && walletPence !== undefined) {
    const userKey = `stellar:user:${em}`;
    const user = await kvGet(url, token, userKey) || {};
    if (creditMode === 'add') {
      user.promoBalance = (user.promoBalance || 0) + Math.round(Number(walletPence));
    } else if (creditMode === 'remove') {
      user.promoBalance = Math.max(0, (user.promoBalance || 0) - Math.round(Number(walletPence)));
    } else if (creditMode === 'set') {
      user.promoBalance = Math.round(Number(walletPence));
    }
    await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
    return res.status(200).json({ ok: true, email: em, walletPence: user.promoBalance });
  }

  // Handle plan grant
  if (plan && email) {
    const userKey = `stellar:user:${em}`;
    const user = await kvGet(url, token, userKey) || {};
    user.plan = plan;
    user.planGranted = true;
    user.planGrantedAt = Date.now();
    await kv(url, token, [['SET', userKey, JSON.stringify(user)]]);
    return res.status(200).json({ ok: true, email: em, plan });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
