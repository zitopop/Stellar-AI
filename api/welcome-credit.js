// api/welcome-credit.js
// Called on first Google sign-in to give £1 welcome credit
// No secret needed — just checks if user is new

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin?.includes('trystellarai.com') ? req.headers.origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'DB not connected' });

  const { email } = req.body || {};
  const em = String(email || '').toLowerCase().trim();
  if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const userKey = 'stellar:user:' + em;

  try {
    // Get existing user record
    const r = await fetch(`${url}/get/${encodeURIComponent(userKey)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    const existing = d.result ? JSON.parse(d.result) : null;

    // Only give credit if they haven't received it yet
    if (existing && existing.welcomeCreditGiven) {
      return res.status(200).json({ ok: true, credited: false, reason: 'already received' });
    }

    // New user — give £1 credit
    const userRecord = {
      ...(existing || {}),
      plan: (existing && existing.plan) || 'free',
      promoBalance: ((existing && existing.promoBalance) || 0) + 100,
      welcomeCreditGiven: true,
      welcomeCreditAt: Date.now(),
      createdAt: (existing && existing.createdAt) || Date.now(),
    };

    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', userKey, JSON.stringify(userRecord)]])
    });

    return res.status(200).json({ ok: true, credited: true, balance: userRecord.promoBalance });

  } catch (e) {
    return res.status(500).json({ error: 'Failed' });
  }
}
