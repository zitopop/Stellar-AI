// api/auth.js — email + password accounts (sign up / sign in)
// Passwords are NEVER stored readable: salted PBKDF2-SHA256, 150,000 rounds.
import crypto from 'crypto';

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 150000, 32, 'sha256').toString('hex');
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
