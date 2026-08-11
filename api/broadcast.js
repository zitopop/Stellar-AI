// api/broadcast.js — send email to all Stellar AI users
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subject, body, secret } = req.body || {};

  if (!secret || secret !== process.env.OWNER_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });

  const KV_URL   = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  const RESEND   = process.env.RESEND_API_KEY;

  try {
    // Get emails from both stellar:auth: and stellar:user: keys
    const [authRes, userRes] = await Promise.all([
      fetch(`${KV_URL}/keys/stellar:auth:*`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } }).then(r => r.json()),
      fetch(`${KV_URL}/keys/stellar:user:*`, { headers: { Authorization: `Bearer ${KV_TOKEN}` } }).then(r => r.json()),
    ]);

    const authEmails = (authRes.result || []).map(k => k.replace('stellar:auth:', ''));
    const userEmails = (userRes.result || []).map(k => k.replace('stellar:user:', ''));

    // Combine and deduplicate
    const allEmails = [...new Set([...authEmails, ...userEmails])].filter(e => e.includes('@'));

    if (allEmails.length === 0) return res.status(200).json({ ok: true, count: 0 });

    let sent = 0;
    for (const email of allEmails) {
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
              <p style="font-size:11px;color:rgba(255,255,255,0.2);margin-top:20px;">support@trystellarai.com</p>
            </div>`,
          }),
        });
        sent++;
      } catch(e) { console.error('Failed:', email, e); }
    }

    return res.status(200).json({ ok: true, count: sent });
  } catch(err) {
    console.error('Broadcast error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
