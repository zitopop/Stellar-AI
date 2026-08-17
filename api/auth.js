// api/auth.js — email + password accounts (sign up / sign in)
// Passwords are NEVER stored readable: salted PBKDF2-SHA256, 150,000 rounds.
import crypto from 'crypto';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 150000, 32, 'sha256').toString('hex');
}

async function sendWelcomeEmail(email) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return;
    const displayName = email.split('@')[0];
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Stellar AI <support@trystellarai.com>',
        to: [email],
        subject: 'Welcome to Stellar AI 🐢',
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><div style="max-width:560px;margin:0 auto;padding:40px 24px;"><div style="text-align:center;margin-bottom:32px;"><div style="font-size:20px;font-weight:900;color:#ffffff;">✦ Stellar AI</div></div><div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;"><h1 style="font-size:24px;font-weight:900;color:#ffffff;margin:0 0 12px;letter-spacing:-0.5px;">Welcome, ${displayName} 🐢</h1><p style="font-size:15px;color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6;">You've got <strong style="color:#10a37f;">£1 free credit</strong> ready to go. That's enough to generate your first complete FiveM script right now.</p><div style="margin-bottom:24px;"><div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-bottom:14px;">Try asking Stellar to build</div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:8px;">"Make a QBCore police job with cuffing, MDT and jailing"</div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:8px;">"Make a QBCore drug system with weed growing and selling"</div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.7);">"Make a Roblox obby with 10 stages and a coin reward"</div></div><a href="https://trystellarai.com/app" style="display:block;background:#10a37f;color:#000;font-weight:800;font-size:15px;text-align:center;padding:14px;border-radius:10px;text-decoration:none;">Open Stellar AI →</a></div><div style="text-align:center;margin-top:24px;"><p style="font-size:12px;color:rgba(255,255,255,0.25);margin:0;">Stellar AI · <a href="https://trystellarai.com/terms.html" style="color:rgba(255,255,255,0.25);">Terms</a> · <a href="mailto:support@trystellarai.com" style="color:rgba(255,255,255,0.25);">support@trystellarai.com</a></p></div></div></body></html>`,
      }),
    });
  } catch (err) {
    console.error('Welcome email failed:', err);
    // Don't block signup if email fails
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin?.includes('trystellarai.com') ? req.headers.origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Database not connected.' });

  const { action, email, password } = req.body || {};
  const em = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password needs to be at least 8 characters.' });
  if (String(password).length > 100) return res.status(400).json({ error: 'Password is too long.' });
  if (action !== 'signup' && action !== 'login') return res.status(400).json({ error: 'Unknown action.' });

  const kvKey = 'stellar:auth:' + em;
  try {
    const getRes = await fetch(`${url}/get/${encodeURIComponent(kvKey)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getData = await getRes.json();
    const existing = getData.result ? JSON.parse(getData.result) : null;

    if (action === 'signup') {
      if (existing) return res.status(409).json({ error: 'That email already has an account — try signing in instead.' });
      const salt = crypto.randomBytes(16).toString('hex');
      const record = { salt, hash: hashPassword(password, salt), createdAt: Date.now() };
      await fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['SET', kvKey, JSON.stringify(record)]])
      });
      // Add £1 free welcome credit (non-blocking)
      const userKey = 'stellar:user:' + em;
      fetch(`${url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['SET', userKey, JSON.stringify({ walletPence: 100, plan: 'free', createdAt: Date.now() })]])
      }).catch(() => {});
      // Send welcome email (non-blocking)
      sendWelcomeEmail(em);
      return res.status(200).json({ ok: true, email: em });
    }

    // login
    if (!existing) return res.status(404).json({ error: 'No account found with that email — create one first.' });
    const tryHash = hashPassword(password, existing.salt);
    const a = Buffer.from(tryHash, 'hex');
    const b = Buffer.from(existing.hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(403).json({ error: 'Wrong password.' });
    }
    return res.status(200).json({ ok: true, email: em });

  } catch (e) {
    return res.status(500).json({ error: 'Could not reach the account service. Try again.' });
  }
}
