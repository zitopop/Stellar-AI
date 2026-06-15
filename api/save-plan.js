// api/save-plan.js
// Saves wallet credit top-ups to Vercel KV
// Plan upgrades are handled exclusively via webhook.js (verified by Stripe)
// This endpoint only handles wallet amounts — it cannot fake a paid plan

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, walletPence } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // Only accept wallet amounts — plan changes come from webhook
  if (walletPence === undefined) return res.status(400).json({ error: 'walletPence required' });

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'KV not configured' });

  try {
    const key = 'stellar:user:' + email.toLowerCase().trim();

    // Get existing record
    const getRes  = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getData = await getRes.json();
    const existing = getData.result ? JSON.parse(getData.result) : {};

    const updated = {
      ...existing,
      walletPence: Math.max(0, parseInt(walletPence) || 0),
      updatedAt: Date.now()
    };

    // Save back
    await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([['SET', key, JSON.stringify(updated)]])
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Save failed' });
  }
}
