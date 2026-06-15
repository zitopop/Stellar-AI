// api/webhook.js
// Stripe webhook — the ONLY place plan upgrades happen
// Stripe signs every request so it cannot be faked
//
// SETUP (one-time):
// 1. Go to stripe.com/dashboard → Webhooks → Add endpoint
// 2. URL: https://trystellarai.com/api/webhook
// 3. Events to listen for:
//      checkout.session.completed
//      customer.subscription.deleted
// 4. Copy the signing secret → add to Vercel env vars as STRIPE_WEBHOOK_SECRET

import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function kvGet(url, token, key) {
  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const d = await r.json();
  return d.result ? JSON.parse(d.result) : null;
}

async function kvSet(url, token, key, value) {
  await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]])
  });
}

// Maps Stripe price amounts (pence) → plan names
// Update these to match your actual Stripe prices
const AMOUNT_TO_PLAN = {
  1000: 'pro',      // £10
  3000: 'max',      // £30
  5000: 'ultimate', // £50
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe          = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;
  const kvUrl           = process.env.KV_REST_API_URL;
  const kvToken         = process.env.KV_REST_API_TOKEN;

  if (!webhookSecret || !kvUrl || !kvToken) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  let event;
  try {
    const rawBody = await getRawBody(req);
    const sig     = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const email    = session.customer_email || session.customer_details?.email;
    const amount   = session.amount_total;      // pence
    const mode     = session.mode;              // 'subscription' or 'payment'
    const meta     = session.metadata || {};

    if (!email) return res.json({ received: true });

    const key      = 'stellar:user:' + email.toLowerCase().trim();
    const existing = (await kvGet(kvUrl, kvToken, key)) || {};

    // --- Wallet top-up ---
    if (meta.type === 'wallet' || mode === 'payment' && !AMOUNT_TO_PLAN[amount]) {
      const bonus = amount >= 1000 ? Math.round(amount * 0.20)
                  : amount >= 500  ? Math.round(amount * 0.10) : 0;
      await kvSet(kvUrl, kvToken, key, {
        ...existing,
        walletPence: (existing.walletPence || 0) + amount + bonus,
        updatedAt: Date.now()
      });
      return res.json({ received: true });
    }

    // --- Plan upgrade ---
    const plan = meta.plan || AMOUNT_TO_PLAN[amount];
    if (plan) {
      await kvSet(kvUrl, kvToken, key, {
        ...existing,
        plan,
        planExpiry: null,         // recurring — no expiry
        stripeCustomerId: session.customer,
        updatedAt: Date.now()
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Subscription cancelled — drop back to free
    const sub   = event.data.object;
    const cid   = sub.customer;
    // Look up by Stripe customer ID
    // (simple scan — fine at small scale)
    const listRes = await fetch(`${kvUrl}/scan/0/match/stellar:user:*`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const listData = await listRes.json();
    const keys     = listData.result?.[1] || [];
    for (const key of keys) {
      const user = await kvGet(kvUrl, kvToken, key);
      if (user?.stripeCustomerId === cid) {
        await kvSet(kvUrl, kvToken, key, {
          ...user,
          plan: 'free',
          planExpiry: null,
          updatedAt: Date.now()
        });
        break;
      }
    }
  }

  return res.json({ received: true });
}
