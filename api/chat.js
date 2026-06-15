// api/chat.js — Stellar AI hardened chat endpoint
// Security: origin check, rate limiting, model gating, input size limits

const DOMAIN       = 'https://trystellarai.com';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const KV_URL        = process.env.KV_REST_API_URL;
const KV_TOKEN      = process.env.KV_REST_API_TOKEN;

// Same hash function as client — owner bypass
function ownerHash(str) {
  let x = 5381;
  const t = str + '|stellar-owner-9';
  for (let i = 0; i < t.length; i++) x = ((x * 33) ^ t.charCodeAt(i)) >>> 0;
  return x.toString(36);
}
const OWNER_KEYS = ['nd1xyu', '13qkufr', '885fn4'];
function isServerOwner(email) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return OWNER_KEYS.includes(ownerHash(e));
}

// Models that require a paid plan
const PRO_MODELS  = ['claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6'];
const MAX_MODELS  = PRO_MODELS; // Power + Ultra both use Opus — we gate by model_key below

// Rate limits (per IP)
const RATE_FREE  = { requests: 40,  windowSec: 3600 }; // 40/hr  — generous for Free
const RATE_PAID  = { requests: 200, windowSec: 3600 }; // 200/hr — paid users

// ── KV helpers (no npm needed) ────────────────────────────────────────────
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

async function kvPipeline(commands) {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands)
    });
  } catch {}
}

// ── Rate limiter ──────────────────────────────────────────────────────────
async function checkRateLimit(ip, isPaid) {
  const key    = `rl:${ip}`;
  const limit  = isPaid ? RATE_PAID : RATE_FREE;
  const record = (await kvGet(key)) || { count: 0, reset: Date.now() + limit.windowSec * 1000 };

  if (Date.now() > record.reset) {
    // Window expired — reset
    record.count = 0;
    record.reset = Date.now() + limit.windowSec * 1000;
  }
  record.count++;
  const allowed = record.count <= limit.requests;

  // Save back (fire and forget)
  kvPipeline([['SET', key, JSON.stringify(record), 'EX', limit.windowSec]]);

  return {
    allowed,
    remaining: Math.max(0, limit.requests - record.count),
    resetAt: record.reset
  };
}

// ── Plan checker from KV ──────────────────────────────────────────────────
async function getPlanFromKV(email) {
  if (!email) return null; // null = unknown, not confirmed free
  const key  = 'stellar:user:' + email.toLowerCase().trim();
  const data = await kvGet(key);
  if (!data) return null; // no KV record — unknown plan
  if (data.planExpiry && Date.now() > data.planExpiry) return 'free';
  return data.plan || 'free';
}

// ── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS — only allow our own domain + localhost for dev
  const origin = req.headers.origin || '';
  const allowed = origin === DOMAIN || origin.includes('localhost') || origin.includes('vercel.app');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : DOMAIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // ── Env check ────────────────────────────────────────────────────────────
  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });
  }

  const {
    model,
    messages,
    system,
    max_tokens,
    stream,
    _email,
    _model_key,
    _client_plan
  } = req.body || {};

  // ── Input validation ─────────────────────────────────────────────────────
  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'model and messages are required' });
  }

  // Cap input size — prevent massive prompt abuse
  const totalChars = JSON.stringify(messages).length + (system || '').length;
  if (totalChars > 400000) {
    return res.status(400).json({ error: 'Message too long. Start a new chat to continue.' });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const ip       = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const kvPlan   = await getPlanFromKV(_email);
  const owner    = isServerOwner(_email);
  // Owner bypasses everything — unlimited access
  const clientPlan = _client_plan || 'free';
  const plan = owner ? 'ultimate' : (kvPlan !== null ? kvPlan : clientPlan);
  const isPaid   = plan !== 'free';
  const rl = owner ? { allowed: true, remaining: 999 } : await checkRateLimit(ip, isPaid);

  if (!rl.allowed) {
    const resetMins = Math.ceil((rl.resetAt - Date.now()) / 60000);
    return res.status(429).json({
      error: `Too many requests. Please wait ${resetMins} minute${resetMins === 1 ? '' : 's'} before trying again.`
    });
  }

  // ── Model gating — server-side plan verification ──────────────────────────
  const modelKey   = _model_key || 'smart';
  const isOpus     = PRO_MODELS.includes(model);

  if (isOpus && !owner) {
    const needsMax    = modelKey === 'ultra';
    const confirmedFree = kvPlan === 'free';
    if (needsMax && confirmedFree && !['max','ultimate'].includes(plan)) {
      return res.status(403).json({ error: 'Ultra model requires Max plan — upgrade at trystellarai.com' });
    }
    if (!needsMax && confirmedFree && !['pro','max','ultimate'].includes(plan)) {
      return res.status(403).json({ error: 'Power model requires Pro plan — upgrade at trystellarai.com' });
    }
  }

  // ── Cap max_tokens server-side ────────────────────────────────────────────
  const maxAllowed = plan === 'ultimate' ? 8000 : plan === 'max' ? 8000 : plan === 'pro' ? 5600 : 4000;
  const safeMaxTokens = Math.min(parseInt(max_tokens) || 2000, maxAllowed);

  // ── Stream from Anthropic ─────────────────────────────────────────────────
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: safeMaxTokens,
        system: system || '',
        messages,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: err?.error?.message || `Anthropic error ${anthropicRes.status}`
      });
    }

    // Pass the stream straight through
    res.setHeader('Content-Type',      'text/event-stream');
    res.setHeader('Cache-Control',     'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection',        'keep-alive');

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();

  } catch (err) {
    console.error('Chat error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to reach AI. Please try again.' });
    }
  }
}
