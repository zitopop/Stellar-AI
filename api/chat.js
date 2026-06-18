// api/chat.js — Stellar AI
// Handles all AI chat requests with rate limiting

const DOMAIN = 'https://trystellarai.com';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const d = await r.json();
    return d.result ? JSON.parse(d.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ex) {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify(value), 'EX', ex]])
    });
  } catch {}
}

async function checkRate(ip, paid) {
  const key = `rl:${ip}`;
  const limit = paid ? 200 : 40;
  const win = 3600;
  const rec = (await kvGet(key)) || { n: 0, reset: Date.now() + win * 1000 };
  if (Date.now() > rec.reset) { rec.n = 0; rec.reset = Date.now() + win * 1000; }
  rec.n++;
  kvSet(key, rec, win);
  return rec.n <= limit;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const ok = origin.includes('trystellarai.com') || origin.includes('localhost') || origin.includes('vercel.app');
  res.setHeader('Access-Control-Allow-Origin', ok ? origin : DOMAIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { model, messages, system, max_tokens, _email, _client_plan } = req.body || {};

  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'model and messages required' });
  }

  if (JSON.stringify(messages).length > 5000000) {
    return res.status(400).json({ error: 'That message is very large — try sending a bit less at once.' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const paid = _client_plan && _client_plan !== 'free';
  const allowed = await checkRate(ip, paid);

  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment' });
  }

  const safeMax = Math.min(parseInt(max_tokens) || 2000, 8000);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: safeMax,
        system: system || '',
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json({ error: err?.error?.message || 'AI error' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstream.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(dec.decode(value, { stream: true }));
    }
    res.end();

  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: 'Connection failed — try again' });
  }
}
