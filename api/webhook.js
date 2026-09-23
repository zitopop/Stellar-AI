// api/webhook.js — Stripe webhook handler
// Stores subscription access and paid top-ups in the same KV user record used by the app.

import Stripe from 'stripe';
import { timingSafeEqual } from 'node:crypto';
import { TOPUP_MAX_PENCE, TOPUP_MIN_PENCE, normalisePlan } from '../lib/pricing.js';
import { applyTopupCheckout } from '../lib/topup.js';
import { recordFirstUpgrade } from '../lib/profile.js';
import { incrementConversionMetric, recordCheckoutCompletion, recordCheckoutExpiry } from '../lib/conversion-metrics.js';
import { escalateOwner } from '../lib/owner-escalation.js';
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { getGmailWatchStatus, processGmailPush, startGmailWatch } from '../lib/gmail-push.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function gmailPushAuthorized(req) {
  const expected = String(process.env.GMAIL_PUSH_TOKEN || '').trim();
  if (!expected) return false;
  const supplied = String(req.headers['x-gmail-push-token'] || req.query?.token || '').trim();
  return secureEqual(expected, supplied);
}

function internalAuthorized(req) {
  const authorization = String(req.headers.authorization || '');
  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  if (cronSecret && secureEqual(authorization, `Bearer ${cronSecret}`)) return true;
  const bridgeToken = String(process.env.CALL_BRIDGE_TOKEN || '').trim();
  const suppliedBridgeToken = String(req.headers['x-call-bridge-token'] || '').trim();
  return Boolean(bridgeToken && secureEqual(suppliedBridgeToken, bridgeToken));
}

function ownerAuthorized(req, res) {
  const session = requireSession(req, res);
  if (!session) return false;
  if (!isOwnerEmail(session.email)) {
    res.status(403).json({ error: 'Owner access is required.' });
    return false;
  }
  return true;
}

async function handleGmailPush(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!gmailPushAuthorized(req)) return res.status(403).json({ error: 'Invalid Gmail push token.' });
  try {
    const result = await processGmailPush(await readJsonBody(req));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Gmail push processing failed', error?.message || error);
    return res.status(500).json({ error: 'Gmail notification could not be processed.' });
  }
}

async function handleGmailWatch(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  const internal = internalAuthorized(req);
  if (!internal && !ownerAuthorized(req, res)) return;
  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const action = req.method === 'GET' ? 'start' : String(body?.action || 'status').trim().toLowerCase();
    if (action === 'status') return res.status(200).json({ ok: true, ...(await getGmailWatchStatus()) });
    if (action === 'start' || action === 'renew') {
      const watch = await startGmailWatch();
      return res.status(200).json({ ok: true, watch, status: await getGmailWatchStatus() });
    }
    return res.status(400).json({ error: 'Unknown Gmail watch action.' });
  } catch (error) {
    console.error('Gmail watch action failed', error?.message || error);
    return res.status(502).json({ error: error?.message || 'Gmail watch could not be updated.' });
  }
}


async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const response = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function kvSet(key, value, seconds) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const command = seconds
      ? ['SET', key, JSON.stringify(value), 'EX', seconds]
      : ['SET', key, JSON.stringify(value)];
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([command]),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function eventKey(eventId) {
  return `stellar:stripe-event:${eventId}`;
}

export default async function handler(req, res) {
  const source = String(req.query?.source || '').trim().toLowerCase();
  if (source === 'gmail-push') return handleGmailPush(req, res);
  if (source === 'gmail-watch') return handleGmailWatch(req, res);
  if (req.method !== 'POST') return res.status(405).end();
  if (!STRIPE_SECRET || !WEBHOOK_SECRET) return res.status(500).json({ error: 'Stripe webhook is not configured.' });
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'Account storage is not configured.' });

  let event;
  try {
    const stripe = new Stripe(STRIPE_SECRET);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(await readRawBody(req), signature, WEBHOOK_SECRET);

    // Stripe can retry events. The record prevents repeat top-ups in normal retry scenarios.
    if (await kvGet(eventKey(event.id))) return res.status(200).json({ received: true, duplicate: true });

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        await recordCheckoutCompletion({ id: String(session.client_reference_id || '') });
        const email = String(session.metadata?.email || session.customer_details?.email || session.customer_email || '').toLowerCase().trim();
      const checkoutPlan = session.metadata?.plan;
      const userKey = email ? `stellar:user:${email}` : '';

      if (!email) {
        console.error('Stripe checkout completed without an email', session.id);
      } else {
        const existing = (await kvGet(userKey)) || {};

        if (checkoutPlan === 'topup') {
          const amount = Math.round(Number(session.metadata?.amount || session.metadata?.qty || 0));
          const paid = session.payment_status === 'paid';
          const amountMatches = Number(session.amount_total) === amount;
          if (!paid || !amountMatches || amount < TOPUP_MIN_PENCE || amount > TOPUP_MAX_PENCE || amount % 50 !== 0) {
            throw new Error(`Invalid completed top-up session ${session.id}`);
          }
          const result = applyTopupCheckout(existing, {
            sessionId: session.id,
            amountPence: amount,
            customerId: typeof session.customer === 'string' ? session.customer : '',
          });
          if (result.applied) {
            const saved = await kvSet(userKey, result.record);
            if (!saved) throw new Error(`Could not persist top-up for ${session.id}`);
            await Promise.all([
              incrementConversionMetric('checkout-completed'),
              incrementConversionMetric('topup-completed'),
              incrementConversionMetric('revenue-pence', Number(session.amount_total || amount)),
            ]);
          }
        } else {
          const plan = normalisePlan(checkoutPlan);
          const subscriptionPaid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
          if (plan && subscriptionPaid) {
            await kvSet(userKey, {
              ...existing,
              plan,
              planBilling: checkoutPlan.endsWith('-annual') ? 'annual' : 'monthly',
              stripeCustomerId: session.customer || existing.stripeCustomerId,
              stripeSubscriptionId: session.subscription || existing.stripeSubscriptionId,
              updatedAt: Date.now(),
            });
            await Promise.all([
              incrementConversionMetric('checkout-completed'),
              incrementConversionMetric('subscription-completed'),
              incrementConversionMetric('revenue-pence', Number(session.amount_total || 0)),
              recordFirstUpgrade(KV_URL, KV_TOKEN, email),
            ]);
          } else if (!plan) {
            console.error('Stripe checkout completed with an unknown plan', checkoutPlan, session.id);
          } else {
            console.error('Stripe subscription checkout completed without a paid status', session.payment_status, session.id);
            throw new Error('Subscription checkout was not paid.');
          }
        }
      }
    } else if (event.type === 'invoice.payment_failed') {
      await escalateOwner({ category: 'payment', severity: 'critical', summary: 'A Stellar AI subscription invoice payment failed in Stripe.' });
    } else if (event.type === 'payout.failed') {
      await escalateOwner({ category: 'payment', severity: 'critical', summary: 'A Stellar AI Stripe payout failed and needs owner attention.' });
    } else if (event.type === 'charge.dispute.created') {
      await escalateOwner({ category: 'fraud', severity: 'critical', summary: 'A new Stripe charge dispute was opened for Stellar AI.' });
    } else if (event.type === 'radar.early_fraud_warning.created') {
      await escalateOwner({ category: 'fraud', severity: 'urgent', summary: 'Stripe Radar created an early fraud warning for Stellar AI.' });
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      if (!session.client_reference_id) await incrementConversionMetric('checkout-cancelled-or-expired');
      else await recordCheckoutExpiry({ id: String(session.client_reference_id) });
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const stripe = new Stripe(STRIPE_SECRET);
      const customer = typeof subscription.customer === 'string'
        ? await stripe.customers.retrieve(subscription.customer)
        : subscription.customer;
      const email = !customer.deleted ? String(customer.email || '').toLowerCase().trim() : '';

      if (email) {
        const userKey = `stellar:user:${email}`;
        const existing = (await kvGet(userKey)) || {};
        await kvSet(userKey, {
          ...existing,
          plan: 'free',
          planBilling: null,
          stripeSubscriptionId: null,
          updatedAt: Date.now(),
        });
      }
    }

    const marked = await kvSet(eventKey(event.id), { receivedAt: Date.now(), type: event.type }, 60 * 60 * 24 * 30);
    if (!marked) throw new Error(`Could not persist Stripe event marker ${event.id}`);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed', error?.message || error);
    if (event?.id) {
      escalateOwner({
        category: 'payment',
        severity: 'critical',
        summary: `Verified Stripe event ${event.type || 'unknown'} failed during processing.`,
      }).catch((escalationError) => console.error('Payment escalation failed', escalationError?.message || escalationError));
    }
    return res.status(400).json({ error: 'Webhook signature or processing failed.' });
  }
}
