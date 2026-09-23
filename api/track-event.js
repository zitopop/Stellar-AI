// api/track-event.js — privacy-safe public funnel event counter
import { incrementConversionMetric } from '../lib/conversion-metrics.js';

const ALLOWED_EVENTS = new Set([
  'homepage-opened',
  'app-opened',
  'chat-sent',
  'model-selected',
  'plan-clicked',
  'checkout-clicked',
  'checkout-started-ui',
  'checkout-cancelled-ui',
  'checkout-success-ui',
  'plugin-opened',
  'support-clicked',
  'settings-opened',
  'thank-you-opened',
  'business-thank-you-opened',
  'ai-receptionist-thank-you-opened',
  'website-audit-thank-you-opened',
]);

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
}

function cleanEvent(value) {
  const event = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  return ALLOWED_EVENTS.has(event) ? event : '';
}

function cleanContext(value) {
  const context = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50);
  return context || 'general';
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const event = cleanEvent(req.body?.event);
  if (!event) return res.status(400).json({ error: 'Unknown analytics event.' });

  // Count broad product movement only. Do not store prompts, names, emails, phone numbers or IP addresses.
  const context = cleanContext(req.body?.context);
  const metric = context === 'general' ? event : `${event}:${context}`;
  const ok = await incrementConversionMetric(metric);
  return res.status(200).json({ ok: Boolean(ok), event, context });
}
