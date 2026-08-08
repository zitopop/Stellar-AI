// api/grant.js — owner-only: grant a plan and/or credit to any account
// Protected by OWNER_SECRET (set in Vercel env vars, never in the app code)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin?.includes('trystellarai.com') ? req.headers.origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.OWNER_SECRET;
  if (!secret) return res.status(500).json({ error: 'Owner tools not set up. Add OWNER_SECRET in Vercel.' });

  const { email, plan, walletPence, creditMode, key } = req.body || {};
  if (key !== secret) return res.status(403).json({ error: 'Wrong owner key.' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });

  const mode = ['add', 'remove', 'set'].includes(creditMode) ? creditMode : 'add';

  const validPlans = ['free', 'lite', 'pro'];
  if (plan && !validPlans.includes(plan)) return res.status(400).json({ error: 'Plan must be free, lite or pro.' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Database not connected.' });

  try {
    const kvKey = 'stellar:user:' + email.toLowerCase().trim();

    const getRes = await fetch(`${url}/get/${encodeURIComponent(kvKey)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getData = await getRes.json();
    const existing = getData.result ? JSON.parse(getData.result) : {};

    const updated = { ...existing, updatedAt: Date.now(), grantedByOwner: true };
    if (plan) updated.plan = plan;
    if (walletPence !== undefined) {
      const current = Math.max(0, parseInt(existing.walletPence) || 0);
      const amount = Math.max(0, parseInt(walletPence) || 0);
      let next;
      if (mode === 'set') next = amount;                 // replace with exact amount (0 clears it)
      else if (mode === 'remove') next = current - amount; // take credit away
      else next = current + amount;                       // add: stack on top of current
      updated.walletPence = Math.max(0, next);            // never below zero
    }

    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', kvKey, JSON.stringify(updated)]])
    });

    return res.status(200).json({
      ok: true,
      email: email,
      plan: updated.plan || 'free',
      walletPence: updated.walletPence || 0
    });
  } catch (e) {
    return res.status(500).json({ error: 'Could not save. Try again.' });
  }
}
