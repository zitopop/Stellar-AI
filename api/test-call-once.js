import { startOwnerCall } from '../lib/owner-call.js';

const NONCE = '532a0f72ce9eb0f89c5497a5d03bacadd8fb6d757db58724';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (String(req.headers['x-test-nonce'] || '') !== NONCE) return res.status(401).json({ ok: false });
  try {
    const data = await startOwnerCall({
      purpose: 'Owner requested a live Jarvis verification call.',
      bridgeToken: String(process.env.CALL_BRIDGE_TOKEN || ''),
    });
    return res.status(200).json({ ok: true, provider: data.provider, status: data.status || 'started', call_id: data.call_id || null });
  } catch (error) {
    return res.status(error?.status >= 400 && error?.status < 500 ? error.status : 502).json({ ok: false, provider: error?.provider || null, error: error?.message || 'Call failed' });
  }
}
