import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { JARVIS_SAFE_ACTIONS, queueJarvisCommand, readJarvisCommand } from '../lib/jarvis-command-gateway.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const session = requireSession(req, res);
  if (!session) return;
  if (!isOwnerEmail(session.email)) return res.status(403).json({ error: 'Owner access is required.' });

  const action = String(req.body?.action || '');
  if (action === 'capabilities') return res.status(200).json({ ok: true, safeActions: JARVIS_SAFE_ACTIONS });
  if (action === 'status') {
    const task = await readJarvisCommand(req.body?.taskId);
    return task ? res.status(200).json({ ok: true, task }) : res.status(404).json({ error: 'Task not found.' });
  }
  if (action !== 'run') return res.status(400).json({ error: 'Unknown Jarvis action.' });

  const result = await queueJarvisCommand(req.body?.command, { source: 'owner', requestedAt: Date.now() });
  if (!result.ok && result.level === 'approval') return res.status(409).json({ error: 'Owner confirmation is required for this command.', approvalRequired: true });
  if (!result.ok) return res.status(400).json({ error: 'That command is not in Jarvis safe execution policy.', safeActions: JARVIS_SAFE_ACTIONS });
  return res.status(202).json(result);
}
