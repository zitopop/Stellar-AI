import { timingSafeEqual } from 'node:crypto';
import { processGmailPush } from '../lib/gmail-push.js';

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function authorized(req) {
  const expected = String(process.env.GMAIL_PUSH_TOKEN || '').trim();
  if (!expected) return false;
  const supplied = String(req.headers['x-gmail-push-token'] || req.query?.token || '').trim();
  return secureEqual(expected, supplied);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!authorized(req)) return res.status(403).json({ error: 'Invalid Gmail push token.' });

  try {
    const result = await processGmailPush(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error('Gmail push processing failed', error?.message || error);
    return res.status(500).json({ error: 'Gmail notification could not be processed.' });
  }
}
