// api/business-builder-access.js — server-authoritative access state for the paid AI website package
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { kvGet } from '../lib/profile.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
}

function entitlementKey(email) {
  return 'stellar:website-builder:' + String(email || '').toLowerCase().trim();
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;

  if (isOwnerEmail(session.email)) {
    return res.status(200).json({ entitled: true, owner: true, package: 'website-builder', pricePence: 9900 });
  }

  if (!KV_URL || !KV_TOKEN) {
    return res.status(503).json({ error: 'Website package access is temporarily unavailable.' });
  }

  try {
    const entitlement = await kvGet(KV_URL, KV_TOKEN, entitlementKey(session.email));
    const entitled = entitlement?.status === 'active' && Boolean(entitlement?.checkoutSessionId);
    return res.status(200).json({
      entitled,
      owner: false,
      package: 'website-builder',
      pricePence: 9900,
      purchasedAt: entitled ? Number(entitlement.purchasedAt) || null : null,
    });
  } catch (error) {
    console.error('Business builder entitlement read failed', error?.message || error);
    return res.status(503).json({ error: 'Could not verify your website package right now.' });
  }
}
