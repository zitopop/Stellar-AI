// api/auth.js — email/password and verified Google sign-in for Stellar AI
import crypto from 'crypto';
import { createSession, readSession } from './_auth.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '308347075858-9eu0dootm325qgq7hba7qsnnchmcke1r.apps.googleusercontent.com';

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

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 150000, 32, 'sha256').toString('hex');
}

function parseStoredValue(result) {
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

async function kvGet(url, token, key) {
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Database read failed');
  return parseStoredValue((await response.json()).result);
}

async function kvSet(url, token, key, value, seconds) {
  const command = seconds
    ? ['SET', key, JSON.stringify(value), 'EX', seconds]
    : ['SET', key, JSON.stringify(value)];
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
  });
  if (!response.ok) throw new Error('Database write failed');
}

function decodeBase64Url(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function verifyGoogleCredential(token) {
  const [headerPart, payloadPart, signaturePart] = String(token || '').split('.');
  if (!headerPart || !payloadPart || !signaturePart) throw new Error('Invalid Google sign-in response.');

  const header = decodeBase64Url(headerPart);
  const payload = decodeBase64Url(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const issuerOk = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com';

  if (header.alg !== 'RS256' || !header.kid || !issuerOk || payload.aud !== GOOGLE_CLIENT_ID || !payload.email_verified || payload.exp <= now) {
    throw new Error('Google sign-in could not be verified.');
  }

  const certResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!certResponse.ok) throw new Error('Could not verify Google sign-in.');
  const keys = await certResponse.json();
  const jwk = keys.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Google signing key was not found. Please try again.');

  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const verified = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerPart}.${payloadPart}`),
    key,
    Buffer.from(signaturePart, 'base64url'),
  );
  if (!verified || !validEmail(String(payload.email || '').toLowerCase().trim())) {
    throw new Error('Google sign-in could not be verified.');
  }

  return {
    email: String(payload.email).toLowerCase().trim(),
    name: String(payload.name || payload.given_name || '').slice(0, 100),
    picture: String(payload.picture || '').slice(0, 500),
  };
}

async function sendWelcomeEmail(email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const displayName = email.split('@')[0].replace(/[._-]+/g, ' ');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Stellar AI <support@trystellarai.com>',
        to: [email],
        subject: 'Welcome to Stellar AI',
        html: `<p>Welcome, ${displayName}.</p><p>Your £1 starter credit is ready. Open <a href="https://trystellarai.com/app">Stellar AI</a> to build your first script.</p>`,
      }),
    });
  } catch {
    // Signup remains successful if a non-essential email delivery fails.
  }
}

async function ensureUser(url, token, email, source) {
  const userKey = `stellar:user:${email}`;
  const existing = await kvGet(url, token, userKey);
  if (existing) return { user: existing, isNew: false };

  const user = {
    plan: 'free',
    walletPence: 100,
    welcomeCreditGiven: true,
    welcomeCreditAt: Date.now(),
    createdAt: Date.now(),
    signInSource: source,
  };
  await kvSet(url, token, userKey, user);
  return { user, isNew: true };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Account storage is not configured.' });

  const { action, email, password, credential, code } = req.body || {};

  try {
    if (action === 'googleLogin') {
      const googleUser = await verifyGoogleCredential(credential);
      const { isNew } = await ensureUser(url, token, googleUser.email, 'google');
      if (isNew) void sendWelcomeEmail(googleUser.email);
      return res.status(200).json({ ok: true, user: googleUser, session: createSession(googleUser.email), isNew });
    }

    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });

    if (action === 'redeemCode') {
      const session = readSession(req);
      if (!session || session.email !== normalizedEmail) return res.status(401).json({ error: 'Please sign in again before redeeming a code.' });
      const normalizedCode = String(code || '').trim().toUpperCase();
      if (!/^STELLAR-[A-Z0-9-]{6,64}$/.test(normalizedCode)) return res.status(400).json({ error: 'That code is not valid.' });

      const codeKey = `stellar:code:${normalizedCode}`;
      const gift = await kvGet(url, token, codeKey);
      if (!gift || gift.used || !Number.isFinite(Number(gift.amount)) || Number(gift.amount) <= 0) {
        return res.status(400).json({ error: 'That code is invalid or has already been used.' });
      }

      const userKey = `stellar:user:${normalizedEmail}`;
      const existing = (await kvGet(url, token, userKey)) || { plan: 'free', createdAt: Date.now() };
      const amount = Math.round(Number(gift.amount));
      const updatedUser = {
        ...existing,
        walletPence: Math.max(0, Number(existing.walletPence) || 0) + amount,
        updatedAt: Date.now(),
      };
      const updatedGift = { ...gift, used: true, usedBy: normalizedEmail, usedAt: Date.now() };
      await kvSet(url, token, userKey, updatedUser);
      await kvSet(url, token, codeKey, updatedGift);
      return res.status(200).json({ ok: true, walletPence: updatedUser.walletPence, amount });
    }

    if (action !== 'signup' && action !== 'login') return res.status(400).json({ error: 'Unknown action.' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password needs to be at least 8 characters.' });
    if (String(password).length > 100) return res.status(400).json({ error: 'Password is too long.' });

    const authKey = `stellar:auth:${normalizedEmail}`;
    const existingAuth = await kvGet(url, token, authKey);

    if (action === 'signup') {
      if (existingAuth) return res.status(409).json({ error: 'That email already has an account. Try signing in instead.' });
      const salt = crypto.randomBytes(16).toString('hex');
      await kvSet(url, token, authKey, { salt, hash: hashPassword(password, salt), createdAt: Date.now() });
      await ensureUser(url, token, normalizedEmail, 'password');
      void sendWelcomeEmail(normalizedEmail);
      return res.status(200).json({ ok: true, email: normalizedEmail, session: createSession(normalizedEmail) });
    }

    if (!existingAuth) return res.status(404).json({ error: 'No account found with that email. Create one first.' });
    const candidate = Buffer.from(hashPassword(password, existingAuth.salt), 'hex');
    const stored = Buffer.from(existingAuth.hash, 'hex');
    if (candidate.length !== stored.length || !crypto.timingSafeEqual(candidate, stored)) {
      return res.status(403).json({ error: 'Wrong password.' });
    }

    return res.status(200).json({ ok: true, email: normalizedEmail, session: createSession(normalizedEmail) });
  } catch (error) {
    console.error('Authentication error', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Could not reach the account service. Try again.' });
  }
}
