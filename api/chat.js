// api/chat.js — Stellar AI
// Handles all AI chat requests with proper plan enforcement

const DOMAIN = 'https://trystellarai.com';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// ── OWNER EMAILS (unlimited) ─────────────────────────────────
const OWNER_EMAILS = ['deadlyfox10@gmail.com', 'zitopops@gmail.com', 'tobi@trystellarai.com', 'support@chromecruiser.com'];

// ── PLAN LIMITS ───────────────────────────────────────────────
const PLAN_LIMITS = {
  free:  { rpm: 40,   maxTokens: 2000, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
  lite:  { rpm: 400,  maxTokens: 5000, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
  plus:  { rpm: 400,  maxTokens: 5000, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
  pro:   { rpm: 1600, maxTokens: 8000, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8'] },
  owner: { rpm: 99999, maxTokens: 8000, models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8'] },
};

// Model name aliases (what the client sends vs actual model)
const MODEL_MAP = {
  'spark':  'claude-haiku-4-5-20251001',
  'star':   'claude-sonnet-4-6',
  'comet':  'claude-opus-4-6',
  'nova':   'claude-opus-4-8',
  // Pass-through if already a real model ID
};

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

async function getPlanFromServer(email) {
  if (!email) return 'free';
  const em = email.toLowerCase().trim();
  if (OWNER_EMAILS.includes(em)) return 'owner';
  const user = await kvGet('stellar:user:' + em);
  return (user && user.plan) ? user.plan : 'free';
}

async function checkRate(ip, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `rl:${ip}:${plan}`;
  const win = 3600;
  const rec = (await kvGet(key)) || { n: 0, reset: Date.now() + win * 1000 };
  if (Date.now() > rec.reset) { rec.n = 0; rec.reset = Date.now() + win * 1000; }
  rec.n++;
  kvSet(key, rec, win);
  return rec.n <= limits.rpm;
}

function resolveModel(requestedModel, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  // Map friendly names to real model IDs
  const resolved = MODEL_MAP[requestedModel?.toLowerCase()] || MODEL_MAP[requestedModel] || requestedModel;
  // Check if plan allows this model
  if (resolved && limits.models.includes(resolved)) return resolved;
  // Check if any plan model starts with the resolved name (partial match)
  const partial = limits.models.find(m => m.startsWith(resolved || ''));
  if (partial) return partial;
  // Safe fallback — always use sonnet (never undefined)
  return 'claude-sonnet-4-6';
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

  const { model, messages, system, max_tokens, _email, image } = req.body || {};

  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'model and messages required' });
  }

  if (JSON.stringify(messages).length > 5000000) {
    return res.status(400).json({ error: 'That message is very large — try sending a bit less at once.' });
  }

  // ── Get REAL plan from server (not from client) ───────────────
  const plan = await getPlanFromServer(_email);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // ── Rate limit ────────────────────────────────────────────────
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const allowed = await checkRate(ip, plan);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment' });
  }

  // ── Model enforcement ─────────────────────────────────────────
  const safeModel = resolveModel(model, plan);

  // ── Token limits by plan ──────────────────────────────────────
  const safeMax = Math.min(parseInt(max_tokens) || limits.maxTokens, limits.maxTokens);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: safeMax,
        system: system || '',
        messages: image ? messages.map((m, i) => {
          if (i === messages.length - 1 && m.role === 'user') {
            return {
              ...m,
              content: [
                { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
                { type: 'text', text: m.content }
              ]
            };
          }
          return m;
        }) : messages,
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
