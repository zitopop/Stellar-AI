import { timingSafeEqual } from 'node:crypto';
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import {
  createStellarCallSession,
  getActiveStellarCall,
  getStellarCall,
  stellarCallConfigured,
  updateStellarCall,
} from '../lib/stellar-call.js';

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function internalAuthorized(req) {
  const expected = String(process.env.CALL_BRIDGE_TOKEN || '').trim();
  const supplied = String(req.headers['x-call-bridge-token'] || '').trim();
  return Boolean(expected && secureEqual(expected, supplied));
}

function ownerSession(req, res) {
  const session = requireSession(req, res);
  if (!session) return null;
  if (!isOwnerEmail(session.email)) {
    res.status(403).json({ error: 'Owner access is required.' });
    return null;
  }
  return session;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const action = String(req.body?.action || 'pending').trim().toLowerCase();

  try {
    if (action === 'create') {
      const internal = internalAuthorized(req);
      if (!internal) {
        const session = ownerSession(req, res);
        if (!session) return;
      }
      const created = await createStellarCallSession({
        category: req.body?.category || 'owner',
        severity: req.body?.severity || 'urgent',
        summary: req.body?.summary || req.body?.purpose || 'Jarvis needs your attention.',
        metadata: req.body?.metadata,
      });
      return res.status(created.ok ? 200 : 503).json(created);
    }

    const session = ownerSession(req, res);
    if (!session) return;

    if (action === 'status') {
      return res.status(200).json({
        ok: true,
        configured: stellarCallConfigured(),
        active: await getActiveStellarCall(),
      });
    }

    if (action === 'pending') {
      return res.status(200).json({ ok: true, call: await getActiveStellarCall() });
    }

    if (action === 'get') {
      const call = await getStellarCall(req.body?.callId);
      if (!call) return res.status(404).json({ error: 'Call not found.' });
      const { metadata: _metadata, ...safeCall } = call;
      return res.status(200).json({ ok: true, call: safeCall });
    }

    if (action === 'answer' || action === 'decline' || action === 'complete') {
      const mapped = action === 'complete' ? 'completed' : (action === 'decline' ? 'declined' : 'answered');
      const updated = await updateStellarCall(req.body?.callId, mapped);
      return res.status(updated.ok ? 200 : 404).json(updated);
    }

    if (action === 'test') {
      const created = await createStellarCallSession({
        category: 'test',
        severity: 'info',
        summary: 'Stellar Call test. Jarvis is checking that your in-app calling screen works.',
        metadata: { trigger: 'owner-test', email: session.email },
      });
      return res.status(created.ok ? 200 : 503).json(created);
    }

    return res.status(400).json({ error: 'Unknown Stellar Call action.' });
  } catch (error) {
    console.error('Stellar Call API failed', error?.message || error);
    return res.status(500).json({ error: 'Stellar Call could not complete that action.' });
  }
}
