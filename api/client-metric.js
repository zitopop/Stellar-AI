import { incrementConversionMetric } from '../lib/conversion-metrics.js';

const ALLOWED = new Set([
  'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
  'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error',
]);

const windows = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

function setHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || 'unknown');
}

function allowedNow(key) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    windows.set(key, { startedAt: now, count: 1 });
    if (windows.size > 5000) {
      for (const [k, value] of windows) if (now - value.startedAt >= WINDOW_MS) windows.delete(k);
    }
    return true;
  }
  current.count += 1;
  return current.count <= MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!allowedNow(clientKey(req))) return res.status(204).end();

  const event = String(req.body?.event || '').trim().toLowerCase();
  if (!ALLOWED.has(event)) return res.status(400).json({ error: 'Unknown metric.' });

  // Persist only fixed event names; ignore page paths, prompts, emails, messages, uploads, card data and arbitrary error text.
  await incrementConversionMetric('client-' + event);
  if (event === 'client-error' || event === 'chat-send-error' || event === 'checkout-error') {
    console.warn('stellar_client_signal', { event });
  }
  return res.status(204).end();
}
