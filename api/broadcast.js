// api/broadcast.js — owner-authorized email broadcast
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { readConversionMetrics } from '../lib/conversion-metrics.js';
import { readFunnelMetrics } from '../lib/funnel-metrics.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Owner access is required.' });

  if (req.body?.action === 'conversionMetrics') {
    const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || '')) ? new Date(`${req.body.date}T00:00:00.000Z`) : new Date();
    const result = await readConversionMetrics(requestedDate);
    return res.status(result.ok ? 200 : 500).json(result);
  }

  if (req.body?.action === 'funnelMetrics') {
    const result = await readFunnelMetrics({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    return res.status(result.ok ? 200 : 500).json(result);
  }

  const subject = String(req.body?.subject || '').trim();
  const body = String(req.body?.body || '').trim();
  if (!subject || !body) return res.status(400).json({ error: 'Enter both a subject and message.' });
  if (subject.length > 160 || body.length > 10000) return res.status(400).json({ error: 'Your email is too long.' });

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const resendKey = process.env.RESEND_API_KEY;
  if (!kvUrl || !kvToken || !resendKey) return res.status(500).json({ error: 'Email delivery is not configured.' });

  try {
    const [authResponse, userResponse] = await Promise.all([
      fetch(`${kvUrl}/keys/stellar:auth:*`, { headers: { Authorization: `Bearer ${kvToken}` } }),
      fetch(`${kvUrl}/keys/stellar:user:*`, { headers: { Authorization: `Bearer ${kvToken}` } }),
    ]);
    if (!authResponse.ok || !userResponse.ok) throw new Error('Recipient lookup failed');

    const authKeys = (await authResponse.json()).result || [];
    const userKeys = (await userResponse.json()).result || [];
    const emails = [...new Set([
      ...authKeys.map((key) => String(key).replace('stellar:auth:', '')),
      ...userKeys.map((key) => String(key).replace('stellar:user:', '')),
    ])].filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email));

    let sent = 0;
    let failed = 0;
    for (const email of emails) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Stellar AI <support@trystellarai.com>',
          reply_to: 'support@trystellarai.com',
          to: [email],
          subject,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#050505;color:#fff;">
            <div style="font-size:18px;font-weight:900;margin-bottom:24px;">✦ Stellar AI</div>
            <div style="font-size:15px;color:rgba(255,255,255,0.84);line-height:1.7;white-space:pre-wrap;">${escapeHtml(body)}</div>
            <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
            <a href="https://trystellarai.com/app" style="display:inline-block;background:#10a37f;color:#000;font-weight:800;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Stellar AI →</a>
          </div>`,
        }),
      });
      if (response.ok) sent += 1;
      else failed += 1;
    }

    return res.status(200).json({ ok: true, count: sent, failed });
  } catch (error) {
    console.error('Broadcast error', error?.message || error);
    return res.status(500).json({ error: 'Could not send the broadcast.' });
  }
}
