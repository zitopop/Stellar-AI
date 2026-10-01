import { timingSafeEqual } from 'node:crypto';
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { createUrgentReminderService, UrgentReminderError } from '../lib/urgent-reminders.js';

function validCron(req) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  const actual = Buffer.from(String(req.headers.authorization || ''));
  const expected = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && actual.length === expected.length && timingSafeEqual(actual, expected);
}

const service = createUrgentReminderService();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    if (req.method === 'GET') {
      if (!validCron(req)) return res.status(401).json({ error: 'Scheduler authorization required.' });
      return res.status(200).json({ ok: true, ...(await service.dispatchDue({ limit: 10 })) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    const session = requireSession(req, res);
    if (!session) return;
    if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Owner access is required.' });

    const action = String(req.body?.action || '').trim();
    if (action === 'schedule') {
      const reminder = await service.schedule(session.email, req.body || {});
      return res.status(200).json({ ok: true, reminder });
    }
    if (action === 'cancel') {
      const reminder = await service.cancel(session.email, req.body?.id);
      return res.status(200).json({ ok: true, reminder });
    }
    return res.status(400).json({ error: 'Unknown urgent reminder action.' });
  } catch (error) {
    const status = error instanceof UrgentReminderError ? error.status : 503;
    return res.status(status).json({ error: error instanceof UrgentReminderError ? error.message : 'Urgent reminder service is unavailable.' });
  }
}
