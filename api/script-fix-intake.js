// api/script-fix-intake.js — verified intake for the paid £99 Priority Script Fix service
import Stripe from 'stripe';
import { resendSender, SUPPORT_EMAIL } from '../lib/email-config.js';

const ALLOWED_PROJECTS = new Set(['fivem','roblox','other']);
const ALLOWED_JOBS = new Set(['fix','build','debug']);

function setHeaders(req, res) {
  const origin = String(req.headers.origin || '');
  if (/^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function clean(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

function validSessionId(value) {
  return /^cs_[A-Za-z0-9_]+$/.test(String(value || ''));
}

function paidScriptFixSession(session) {
  return Boolean(
    session
    && session.metadata?.app === 'stellar-ai'
    && session.metadata?.plan === 'script-fix'
    && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
    && Number(session.amount_total) === 9900
    && String(session.currency || '').toLowerCase() === 'gbp'
  );
}

function customerEmail(session) {
  return String(session?.customer_details?.email || session?.customer_email || session?.metadata?.email || '').trim().toLowerCase();
}

function maskedEmail(email) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) return '';
  return (name.length <= 2 ? name[0] + '*' : name.slice(0, 2) + '*'.repeat(Math.min(6, name.length - 2))) + '@' + domain;
}

async function saveOrder(order) {
  const url = String(process.env.KV_REST_API_URL || '').replace(/\/$/, '');
  const token = String(process.env.KV_REST_API_TOKEN || '').trim();
  if (!url || !token) return false;
  const response = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', 'stellar:script-fix:' + order.checkoutSessionId, JSON.stringify(order), 'EX', 34560000]]),
    signal: AbortSignal.timeout(8000),
  });
  return response.ok;
}

async function emailOwner(order) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = resendSender();
  if (!apiKey || !from) return { ok: false, reason: 'email-not-configured' };
  const subject = 'PAID £99 SCRIPT JOB — ' + order.projectType.toUpperCase() + ' · ' + order.jobType.toUpperCase();
  const text = [
    'A paid Priority Script Fix order is ready.',
    '',
    'Paid: £99',
    'Customer: ' + order.customerEmail,
    'Project: ' + order.projectType,
    'Job: ' + order.jobType,
    'Framework / stack: ' + (order.framework || 'Not specified'),
    'Reference link: ' + (order.referenceLink || 'None'),
    'Checkout session: ' + order.checkoutSessionId,
    '',
    'CUSTOMER BRIEF',
    '--------------',
    order.brief,
    '',
    'Reply to this email to contact the customer directly.',
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'stellar-script-fix-' + order.checkoutSessionId,
    },
    body: JSON.stringify({
      from,
      to: [SUPPORT_EMAIL],
      reply_to: order.customerEmail,
      subject,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  return response.ok && data?.id ? { ok: true, id: String(data.id) } : { ok: false, reason: 'email-provider-rejected' };
}

export default async function handler(req, res) {
  setHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });

  const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeSecret) return res.status(503).json({ error: 'Payments are temporarily unavailable.' });

  const input = req.method === 'GET' ? (req.query || {}) : (req.body || {});
  const sessionId = clean(input.session_id || input.sessionId, 200);
  if (!validSessionId(sessionId)) return res.status(400).json({ error: 'A valid checkout session is required.' });

  try {
    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!paidScriptFixSession(session)) {
      return res.status(403).json({ error: 'This checkout is not a confirmed paid Priority Script Fix order.' });
    }
    const email = customerEmail(session);
    if (!email) return res.status(409).json({ error: 'The paid checkout is missing a customer email.' });

    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, paid: true, amountPence: 9900, currency: 'gbp', customerEmail: maskedEmail(email) });
    }

    const projectType = clean(input.projectType, 20).toLowerCase();
    const jobType = clean(input.jobType, 20).toLowerCase();
    const framework = clean(input.framework, 120);
    const referenceLink = clean(input.referenceLink, 500);
    const brief = clean(input.brief, 20000);

    if (!ALLOWED_PROJECTS.has(projectType)) return res.status(400).json({ error: 'Choose FiveM, Roblox, or Other.' });
    if (!ALLOWED_JOBS.has(jobType)) return res.status(400).json({ error: 'Choose Fix, Build, or Debug.' });
    if (brief.length < 20) return res.status(400).json({ error: 'Add a little more detail, code, or the exact error so the job can be started.' });
    if (referenceLink && !/^https?:\/\//i.test(referenceLink)) return res.status(400).json({ error: 'Reference link must start with http:// or https://.' });

    const order = {
      version: 1,
      status: 'brief_submitted',
      checkoutSessionId: sessionId,
      customerEmail: email,
      amountPence: 9900,
      currency: 'gbp',
      projectType,
      jobType,
      framework,
      referenceLink,
      brief,
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = await saveOrder(order).catch(() => false);
    const emailed = await emailOwner(order).catch(() => ({ ok: false, reason: 'email-failed' }));
    if (!emailed.ok) {
      return res.status(503).json({
        error: saved
          ? 'Your paid brief is saved, but the inbox notification did not send yet. Please press Submit again in a moment; you will not be charged again.'
          : 'Your brief could not be delivered right now. Please try again.',
        saved,
      });
    }

    if (saved) {
      await saveOrder({ ...order, status: 'owner_notified', ownerEmailMessageId: emailed.id, updatedAt: Date.now() }).catch(() => {});
    }
    return res.status(200).json({ ok: true, saved, ownerNotified: true, contact: SUPPORT_EMAIL });
  } catch (error) {
    console.error('Priority Script Fix intake failed', error?.message || error);
    return res.status(503).json({ error: 'The paid order could not be verified or delivered right now. Please try again.' });
  }
}
