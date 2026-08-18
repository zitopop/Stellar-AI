// api/webhook.js — Stripe webhook handler
// Stores subscription access and paid top-ups in the same KV user record used by the app.

import Stripe from 'stripe';
import { topupBonusPence, normalisePlan } from '../lib/pricing.js';
import { incrementConversionMetric } from '../lib/conversion-metrics.js';

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
      const email = String(session.metadata?.email || session.customer_details?.email || session.customer_email || '').toLowerCase().trim();
      const checkoutPlan = session.metadata?.plan;
      const userKey = email ? `stellar:user:${email}` : '';

      if (!email) {
        console.error('Stripe checkout completed without an email', session.id);
      } else {
        const existing = (await kvGet(userKey)) || {};

        if (checkoutPlan === 'topup') {
          const amount = Math.round(Number(session.metadata?.amount || session.metadata?.qty || 0));
          if (amount > 0) {
            const bonus = topupBonusPence(amount);
            await kvSet(userKey, {
              ...existing,
              plan: existing.plan || 'free',
              walletPence: Math.max(0, Number(existing.walletPence) || 0) + amount + bonus,
              stripeCustomerId: session.customer || existing.stripeCustomerId,
              updatedAt: Date.now(),
            });
            await Promise.all([
              incrementConversionMetric('checkout-completed'),
              incrementConversionMetric('topup-completed'),
              incrementConversionMetric('revenue-pence', Number(session.amount_total || amount)),
            ]);
          }
        } else {
          const plan = normalisePlan(checkoutPlan);
          if (plan) {
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
            ]);
          } else {
            console.error('Stripe checkout completed with an unknown plan', checkoutPlan, session.id);
          }
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      await incrementConversionMetric('checkout-cancelled-or-expired');
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

    await kvSet(eventKey(event.id), { receivedAt: Date.now(), type: event.type }, 60 * 60 * 24 * 30);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed', error?.message || error);
    return res.status(400).json({ error: 'Webhook signature or processing failed.' });
  }
}
