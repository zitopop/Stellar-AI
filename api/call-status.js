import { createHmac, timingSafeEqual } from 'node:crypto';

const FAILED_STATUSES = new Set(['busy', 'failed', 'no-answer', 'canceled']);
const PUBLIC_URL = String(process.env.JARVIS_PUBLIC_URL || 'https://trystellarai.com').replace(/\/$/, '');

function validTwilioSignature(req) {
  const token = String(process.env.TWILIO_AUTH_TOKEN || '');
  const supplied = String(req.headers?.['x-twilio-signature'] || '');
  if (!token || !supplied) return false;
  const context = encodeURIComponent(String(req.query?.context || ''));
  let payload = `${PUBLIC_URL}/api/call-status?context=${context}`;
  for (const key of Object.keys(req.body || {}).sort()) payload += `${key}${req.body[key]}`;
  const expected = createHmac('sha1', token).update(payload).digest('base64');
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function redis(url, token, command) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]), signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Call status storage request failed.');
  const data = await response.json().catch(() => []);
  return data?.[0]?.result ?? null;
}

async function sendFallback(fallback) {
  const resendKey = process.env.RESEND_API_KEY;
  const recipients = String(process.env.OWNER_EMAILS || process.env.OWNER_EMAIL || '')
    .split(/[\s,;]+/).map((value) => value.trim())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value));
  if (!resendKey || !recipients.length || !fallback?.summary) return false;
  const category = String(fallback.category || 'service').slice(0, 40);
  const severity = String(fallback.severity || 'urgent').slice(0, 20);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Stellar AI <support@trystellarai.com>', to: recipients,
      subject: `[Stellar ${severity.toUpperCase()}] ${category} alert — phone call unavailable`,
      text: `Stellar AI could not complete the urgent owner phone call.\n\nCategory: ${category}\nSeverity: ${severity}\n\n${String(fallback.summary).slice(0, 300)}` }),
    signal: AbortSignal.timeout(10000),
  });
  return response.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const contextId = String(req.query?.context || '').trim();
  const status = String(req.body?.CallStatus || req.body?.callStatus || '').toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(contextId) || !status) return res.status(400).json({ error: 'Invalid call status.' });
  if (!validTwilioSignature(req)) return res.status(401).json({ error: 'Invalid Twilio signature.' });
  if (!FAILED_STATUSES.has(status)) return res.status(204).end();
  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(503).json({ error: 'Call status storage unavailable.' });
  try {
    const raw = await redis(url, token, ['GET', `stellar:jarvis:call-context:${contextId}`]);
    if (!raw) return res.status(204).end();
    const context = JSON.parse(raw);
    if (!context?.fallback?.summary) return res.status(204).end();
    const once = await redis(url, token, ['SET', `stellar:jarvis:call-fallback:${contextId}`, status, 'NX', 'EX', 3600]);
    if (once !== 'OK') return res.status(204).end();
    if (!await sendFallback(context.fallback)) return res.status(502).json({ error: 'Fallback email failed.' });
    return res.status(200).json({ ok: true, fallback: 'email' });
  } catch (error) {
    console.error('Jarvis call status callback failed', error?.message || error);
    return res.status(502).json({ error: 'Call status callback failed.' });
  }
}