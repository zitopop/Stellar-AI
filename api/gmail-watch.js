import { timingSafeEqual } from 'node:crypto';
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { getGmailWatchStatus, startGmailWatch } from '../lib/gmail-push.js';

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function internalAuthorized(req) {
  const suppliedAuthorization = String(req.headers.authorization || '');
  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  if (cronSecret && secureEqual(suppliedAuthorization, `Bearer ${cronSecret}`)) return true;

  const bridgeToken = String(process.env.CALL_BRIDGE_TOKEN || '').trim();
  const suppliedBridgeToken = String(req.headers['x-call-bridge-token'] || '').trim();
  return Boolean(bridgeToken && secureEqual(suppliedBridgeToken, bridgeToken));
}

function ownerAuthorized(req, res) {
  const session = requireSession(req, res);
  if (!session) return false;
  if (!isOwnerEmail(session.email)) {
    res.status(403).json({ error: 'Owner access is required.' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });

  const internal = internalAuthorized(req);
  if (!internal && !ownerAuthorized(req, res)) return;

  const action = req.method === 'GET' ? 'start' : String(req.body?.action || 'status').trim().toLowerCase();
  try {
    if (action === 'status') {
      return res.status(200).json({ ok: true, ...(await getGmailWatchStatus()) });
    }
    if (action === 'start' || action === 'renew') {
      const watch = await startGmailWatch();
      return res.status(200).json({ ok: true, watch, status: await getGmailWatchStatus() });
    }
    return res.status(400).json({ error: 'Unknown Gmail watch action.' });
  } catch (error) {
    console.error('Gmail watch action failed', error?.message || error);
    return res.status(502).json({ error: error?.message || 'Gmail watch could not be updated.' });
  }
}
