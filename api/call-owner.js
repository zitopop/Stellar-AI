import { isOwnerEmail, requireSession } from '../lib/auth.js';

const BRIDGE_URL = 'https://ai-receptionist-live-chi.vercel.app/api/call-owner';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Owner access is required.' });

  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Owner session is required.' });

  try {
    const bridge = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authorization },
      body: JSON.stringify({
        purpose: String(req.body?.purpose || 'Owner requested a call from Jarvis in Stellar AI.').slice(0, 300),
      }),
    });
    const data = await bridge.json().catch(() => ({}));
    if (!bridge.ok) return res.status(bridge.status >= 500 ? 502 : bridge.status).json({ error: data?.error || 'The phone service could not start the call.' });
    return res.status(200).json({ ok: true, call_id: data?.call_id || null, status: data?.status || 'started' });
  } catch (error) {
    console.error('Owner call bridge error', error?.message || error);
    return res.status(502).json({ error: 'The phone bridge is unavailable.' });
  }
}