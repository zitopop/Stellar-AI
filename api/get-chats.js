// api/get-chats.js
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const d = await r.json();
    return d.result || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = origin.includes('trystellarai.com') || origin.includes('localhost') || origin.includes('vercel.app');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const key  = 'stellar:chats:' + email.toLowerCase().trim();
    const data = await kvGet(key);
    if (!data) return res.status(200).json({ chats: [] });

    const chats = JSON.parse(data);
    return res.status(200).json({ chats: Array.isArray(chats) ? chats : [] });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load chats' });
  }
}
