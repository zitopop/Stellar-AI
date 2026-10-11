// Authenticated deletion-request intake kept outside /api to avoid adding a Vercel function.
// Requests do not automatically delete data. The operator must complete deletion and confirm it.
import { readSession, isOwnerEmail } from './auth.js';
import { kvGet, kvPipeline } from './profile.js';
import { resendSender, SUPPORT_EMAIL } from './email-config.js';

const PREFIX = 'stellar:account-deletion:request:';
const QUEUE = 'stellar:account-deletion:queue';

function status(record) {
  if (!record) return { requested: false, status: 'none' };
  return {
    requested: true,
    status: ['pending', 'processing', 'completed'].includes(record.status) ? record.status : 'pending',
    requestedAt: Number(record.requestedAt) || null,
    completedAt: Number(record.completedAt) || null,
  };
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
      text: 'A signed-in Stellar AI account submitted a deletion request.\nAccount: ' + email +
        '\nReview the deletion queue and verify data erasure before confirming completion.'
    })
  });
  if (!response.ok) throw new Error('Support notification failed');
  return true;
}

export async function handleAccountDeletionRequest(req, res, url, token) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in again to continue.' });
  if (!url || !token) return res.status(503).json({ error: 'Account request service is unavailable.' });
  const action = String(req.body?.action || '');
  const key = PREFIX + session.email;

  try {
    if (action === 'listDeletionRequests') {
      if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Not authorised.' });
      const result = await kvPipeline(url, token, [['LRANGE', QUEUE, 0, 99]]);
      const addresses = [...new Set(Array.isArray(result?.[0]?.result) ? result[0].result.map(String) : [])];
      const requests = (await Promise.all(addresses.map(async email => {
        const record = await kvGet(url, token, PREFIX + email);
        return record ? { email, ...status(record) } : null;
      }))).filter(Boolean);
      return res.status(200).json({ requests });
    }

    if (action === 'getDeletionRequestStatus') {
      return res.status(200).json(status(await kvGet(url, token, key)));
    }

    if (action !== 'requestAccountDeletion') return res.status(400).json({ error: 'Unsupported deletion request.' });
    if (req.body?.confirm !== 'DELETE') return res.status(400).json({ error: 'Please confirm this account deletion request.' });

    const existing = await kvGet(url, token, key);
    if (existing) return res.status(200).json(status(existing));

    const record = { status: 'pending', requestedAt: Date.now() };
    const written = await kvPipeline(url, token, [['SET', key, JSON.stringify(record), 'NX']]);
    if (!['OK', true, 1].includes(written?.[0]?.result)) {
      return res.status(200).json(status((await kvGet(url, token, key)) || record));
    }
    // The durable request remains available even when indexing or email fails.
    try {
      await kvPipeline(url, token, [['LPUSH', QUEUE, session.email]]);
    } catch (error) { console.error('Deletion queue indexing failed:', error?.message || error); }
    try {
      await notifySupport(session.email);
    } catch (error) { console.error('Deletion support notification failed:', error?.message || error); }
    return res.status(202).json({
      ...status(record),
      message: 'Account deletion request recorded. We will confirm when it is completed.'
    });
  } catch (error) {
    console.error('Account deletion request error:', error?.message || error);
    return res.status(503).json({ error: 'Could not record your request. Please try again.' });
  }
}
