import { isOwnerEmail, requireSession } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const session = requireSession(req, res);
  if (!session) return;

  if (!isOwnerEmail(session.email)) {
    return res.status(403).json({ ok: false, owner: false });
  }

  return res.status(200).json({ ok: true, owner: true });
}
