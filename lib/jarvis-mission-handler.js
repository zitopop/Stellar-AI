import { timingSafeEqual } from 'node:crypto';
import { requireSession, isOwnerEmail } from './auth.js';
import { createMissionService, createRedisMissionStore, MissionError } from './jarvis-missions.js';
import * as providers from './jarvis-providers.js';

function validCron(req, secret) {
  if (!secret) return false;
  const actual = Buffer.from(String(req.headers.authorization || ''));
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createJarvisMissionHandler({ service = createMissionService({ store: createRedisMissionStore(), providers }), env = process.env } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      if (String(req.query?.action || '') === 'worker') {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
        if (!validCron(req, env.CRON_SECRET)) return res.status(401).json({ error: 'Scheduler authorization required.' });
        return res.status(200).json({ ok: true, ...await service.tick() });
      }
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const session = requireSession(req, res);
      if (!session) return;
      if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Jarvis business missions are available to the owner.' });
      const input = req.body || {};
      if (input.action === 'status') return res.status(200).json({ ok: true, ...await service.status(session.email) });
      let mission;
      if (input.action === 'create') mission = await service.create(session.email, input);
      else if (input.action === 'run' || input.action === 'retry') mission = await service.run(input.id, session.email, { retry: input.action === 'retry' });
      else if (input.action === 'cancel') mission = await service.cancel(input.id, session.email);
      else return res.status(400).json({ error: 'Unknown Jarvis action.' });
      return res.status(200).json({ ok: true, mission });
    } catch (error) {
      return res.status(error instanceof MissionError ? error.status : 503).json({
        error: error instanceof MissionError ? error.message : 'Jarvis could not complete this request. Refresh to check your saved progress.',
      });
    }
  };
}

export default createJarvisMissionHandler();
