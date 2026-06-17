// api/generate-image.js — hardened with rate limiting
// Images cost significantly more than text — strict limits apply

const DOMAIN = 'https://trystellarai.com';
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Image rate limits — much stricter than chat
const IMG_LIMIT_FREE = { requests: 5,  windowSec: 3600 }; // 5 images/hr free
const IMG_LIMIT_PAID = { requests: 30, windowSec: 3600 }; // 30 images/hr paid

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

async function kvSet(key, value, exSec) {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    const cmd = exSec
      ? [['SET', key, JSON.stringify(value), 'EX', exSec]]
      : [['SET', key, JSON.stringify(value)]];
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
  } catch {}
}

async function checkImageRateLimit(ip, isPaid) {
  const key   = `img_rl:${ip}`;
  const limit = isPaid ? IMG_LIMIT_PAID : IMG_LIMIT_FREE;
  const rec   = (await kvGet(key)) || { count: 0, reset: Date.now() + limit.windowSec * 1000 };
  if (Date.now() > rec.reset) { rec.count = 0; rec.reset = Date.now() + limit.windowSec * 1000; }
  rec.count++;
  const allowed = rec.count <= limit.requests;
  kvSet(key, rec, limit.windowSec);
  return { allowed, remaining: Math.max(0, limit.requests - rec.count) };
}

async function getPlan(email) {
  if (!email) return null;
  const data = await kvGet('stellar:user:' + email.toLowerCase().trim());
  if (!data) return null;
  if (data.planExpiry && Date.now() > data.planExpiry) return 'free';
  return data.plan || 'free';
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowed = origin.includes('trystellarai.com') || origin.includes('localhost');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : DOMAIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, email, _client_plan } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Sanitise prompt — max 500 chars, no injection attempts
  const safePrompt = prompt.slice(0, 500).replace(/[\u0000-\u001F]/g, '');

  // Rate limit by IP
  const ip      = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const kvPlan  = await getPlan(email);
  const plan    = kvPlan ?? (_client_plan || 'free');
  const isPaid  = plan !== 'free';
  const rl      = await checkImageRateLimit(ip, isPaid);

  if (!rl.allowed) {
    return res.status(429).json({
      error: `Image limit reached. Free: 5/hr, Paid: 30/hr. Try again later.`
    });
  }

  // HD images for Max+ only
  const isHD = ['max', 'ultimate'].includes(plan);

  try {
    // Using Pollinations AI (free tier) — replace with your preferred image API
    const pollKey = process.env.POLLINATIONS_API_KEY;
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=${isHD ? 1024 : 512}&height=${isHD ? 1024 : 512}&nologo=true&seed=${seed}${pollKey ? `&apikey=${pollKey}` : ''}`;

    // Fetch the image server-side, then return it as a data URL the chat can show inline.
    // This way the picture appears straight away (like Claude) instead of the browser
    // having to load a slow external URL that sometimes times out.
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Image generation failed: ${imgRes.status}`);

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).json({ url: dataUrl });

  } catch (err) {
    console.error('Image error:', err.message);
    return res.status(500).json({ error: 'Could not generate image. Try again.' });
  }
}
