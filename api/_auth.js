// api/_auth.js — lightweight signed sessions for Stellar AI serverless routes
import crypto from 'crypto';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function signingSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.OWNER_SECRET || '';
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(encodedPayload) {
  return crypto.createHmac('sha256', signingSecret()).update(encodedPayload).digest('base64url');
}

export function createSession(email) {
  const secret = signingSecret();
  if (!secret) throw new Error('AUTH_SESSION_SECRET is not configured.');
  const payload = {
    email: String(email).toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSession(req) {
  const secret = signingSecret();
  if (!secret) return null;
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const actual = Buffer.from(expected);
  if (provided.length !== actual.length || !crypto.timingSafeEqual(provided, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload?.email || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { email: String(payload.email).toLowerCase().trim() };
  } catch {
    return null;
  }
}

export function requireSession(req, res) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: 'Please sign in again to continue.' });
    return null;
  }
  return session;
}
