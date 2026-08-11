// api/broadcast.js — send email to all Stellar AI users
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subject, body, secret } = req.body || {};

  // Verify owner
  const OWNER_HASH = '10f0e7b1a2f2d3e4b5c6a7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8';
  const hash = crypto.createHash('sha256').update(String(secret || '')).digest('hex');
  if (hash !== process.env.OWNER_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });

  const KV_URL   = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  const RESEND   = process.env.RESEND_API_KEY;

  try {
    // Get all auth keys (users)
    const keysRes = await fetch(`${KV_URL}/keys/stellar:auth:*`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const keysData = await keysRes.json();
    const keys = keysData.result || [];

    // Extract emails from keys
    const emails = keys.map(k => k.replace('stellar:auth:', '')).filter(e => e.includes('@'));

    if (emails.length === 0) return res.status(200).json({ ok: true, count: 0 });

    // Send email to each user via Resend
    let sent = 0;
    for (const email of emails) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Stellar AI <support@trystellarai.com>',
            to: [email],
            subject: subject,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#050505;color:#fff;">
              <div style="font-size:18px;font-weight:900;margin-bottom:24px;">✦ Stellar AI</div>
              <div style="font-size:15px;color:rgba(255,255,255,0.8);line-height:1.7;white-space:pre-wrap;">${body}</div>
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">
              <a href="https://trystellarai.com/app" style="display:inline-block;background:#10a37f;color:#000;font-weight:800;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Stellar AI →</a>
              <p style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:20px;">support@trystellarai.com · <a href="https://trystellarai.com/terms.html" style="color:rgba(255,255,255,0.2);">Unsubscribe</a></p>
            </div>`,
          }),
        });
        sent++;
      } catch(e) { console.error('Failed to email:', email, e); }
    }

    return res.status(200).json({ ok: true, count: sent });

  } catch(err) {
    console.error('Broadcast error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
