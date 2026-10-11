// Requests account deletion without requiring the customer to contact support.
// This records a verified signed-in request; fulfillment remains a separate, audited process.
import { requireSession, isOwnerEmail } from '../lib/auth.js';
import { kvGet, kvPipeline } from '../lib/profile.js';
import { resendSender, SUPPORT_EMAIL } from '../lib/email-config.js';

const REQUEST_PREFIX = 'stellar:account-deletion:request:';
const QUEUE_KEY = 'stellar:account-deletion:queue';
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function invalidStorage() {
  return !(KV_URL && KV_TOKEN);
}

async function notifySupport(email) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = resendSender();
  if (!apiKey || !from) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [SUPPORT_EMAIL],
      subject: 'Stellar AI — account deletion request pending',
      text: 'A signed-in Stellar account submitted an account deletion request.\nAccount: ' +
        email + '\nReview the account deletion queue and follow the verified deletion runbook before marking complete.'
    })
  });
  if (!response.ok) throw new Error('Support mail delivery failed');
  return true;
}

function responseStatus(record) {
  if (!record) return { requested: false, status: 'none' };
  return {
    requested: true,
    status: ['pending', 'processing', 'completed'].includes(record.status) ? record.status : 'pending',
    requestedAt: Number(record.requestedAt) || null,
    completedAt: Number(record.completedAt) || null,
  };
}

export default async function handler(req, res) {
  noStore(res);
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const session = requireSession(req, res);
  if (!session) return;
  if (invalidStorage()) return res.status(503).json({ error: 'Account request service is currently unavailable.' });

  try {
    if (req.method === 'GET' && req.query?.admin === '1') {
      if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Not authorised.' });
      const items = await kvPipeline(KV_URL, KV_TOKEN, [['LRANGE', QUEUE_KEY, 0, 99]]);
      const ids = Array.isArray(items?.[0]?.result) ? items[0].result : [];
      const unique = [...new Set(ids.map(String))];
      const requests = (await Promise.all(unique.map(async email => {
        const record = await kvGet(KV_URL, KV_TOKEN, REQUEST_PREFIX + email);
        return record ? { email, ...responseStatus(record) } : null;
      }))).filter(Boolean);
      return res.status(200).json({ requests });
    }

    const key = REQUEST_PREFIX + session.email;
    const prior = await kvGet(KV_URL, KV_TOKEN, key);
    if (req.method === 'GET') return res.status(200).json(responseStatus(prior));
    if (req.body?.confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Please confirm that you want to request deletion.' });
    }
    if (prior) return res.status(200).json(responseStatus(prior));

    const now = Date.now();
    const record = { status: 'pending', requestedAt: now };
    // Only the currently authenticated account can request its own deletion.
    const created = await kvPipeline(KV_URL, KV_TOKEN, [
      ['SET', key, JSON.stringify(record), 'NX']
    ]);
    if (!['OK', true, 1].includes(created?.[0]?.result)) {
      const existing = await kvGet(KV_URL, KV_TOKEN, key);
      return res.status(200).json(responseStatus(existing || record));
    }

    // The request is already safely stored if queue indexing encounters an error.
    // A manual operator can still find it by the user's verified account email.
    try {
      await kvPipeline(KV_URL, KV_TOKEN, [['LPUSH', QUEUE_KEY, session.email]]);
    } catch (queueError) {
      console.error('Account deletion request queue index failed:', queueError?.message || queueError);
    }
    try { await notifySupport(session.email); } catch (emailError) {
      console.error('Deletion support notification failed:', emailError?.message || emailError);
    }
    return res.status(202).json({
      ...responseStatus(record),
      message: 'Your account deletion request has been received. We will review it and confirm when it is completed.'
    });
  } catch (error) {
    console.error('Account deletion request failed:', error?.message || error);
    return res.status(503).json({ error: 'Could not process this account request. Please try again or use the support link.' });
  }
}
