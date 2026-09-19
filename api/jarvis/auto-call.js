import { maybeAutoCallOwner, getJarvisAutoCallPolicy } from '../../lib/jarvis-auto-call.js';

function authorized(req) {
  const expected = String(process.env.JARVIS_TRIGGER_SECRET || '').trim();
  if (!expected) return false;
  const supplied = String(req.headers['x-jarvis-trigger-secret'] || '').trim();
  return supplied.length > 0 && supplied === expected;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    return res.status(200).json({ ok: true, policy: getJarvisAutoCallPolicy() });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    const result = await maybeAutoCallOwner({
      category: body.category,
      purpose: body.purpose,
      urgent: body.urgent !== false,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      bridgeToken: String(process.env.CALL_BRIDGE_TOKEN || ''),
    });
    return res.status(result.called ? 201 : 200).json(result);
  } catch (error) {
    console.error('Jarvis automatic owner call failed', error?.provider || '', error?.status || '', error?.message || error);
    return res.status(Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 503).json({
      ok: false,
      called: false,
      provider: error?.provider || 'none',
      error: error?.message || 'Automatic owner call failed.',
    });
  }
}
