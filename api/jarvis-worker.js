// Vercel's production cron invokes this route with Authorization: Bearer CRON_SECRET.
// Reuse Jarvis's existing constant-time scheduler authentication and durable queue.
import jarvisMissionHandler from '../lib/jarvis-mission-handler.js';

export default function handler(req, res) {
  // The public route never accepts an action selected by a caller.
  // Every request is handled exclusively as a scheduler invocation.
  const workerRequest = Object.create(req);
  workerRequest.query = { action: 'worker' };
  return jarvisMissionHandler(workerRequest, res);
}
