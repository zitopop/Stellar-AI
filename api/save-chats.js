// api/save-chats.js
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = origin.includes('trystellarai.com') || origin.includes('localhost') || origin.includes('vercel.app');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, chats } = req.body || {};
  if (!email || !Array.isArray(chats)) {
    return res.status(400).json({ error: 'email and chats required' });
  }

  try {
    // Keep last 15 chats only, and trim messages to save space
    const trimmed = chats.slice(0, 15).map(chat => ({
      id:       chat.id,
      name:     chat.name,
      pinned:   chat.pinned || false,
      messages: (chat.messages || []).slice(-30).map(m => ({
        role:    m.role,
        content: typeof m.content === 'string'
          ? m.content.slice(0, 8000)   // cap each message at 8KB
          : m.content,
        t: m.t
      }))
    }));

    const key = 'stellar:chats:' + email.toLowerCase().trim();
    await kvSet(key, JSON.stringify(trimmed));
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save chats' });
  }
}
