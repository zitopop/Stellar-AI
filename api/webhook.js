// api/webhook.js — Stripe webhook handler
// Writes plan + credit to Vercel KV (same store as get-plan.js)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

export const config = { api: { bodyParser: false } };

async function buffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    const d = await r.json();
    return d.result ? JSON.parse(d.result) : null;
  } catch { return null; }
}

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) return;
  await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]])
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;

  // ── Subscription paid ────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const email = session.metadata?.email || session.customer_email;
    const plan  = session.metadata?.plan;
    const qty   = parseInt(session.metadata?.amount || session.metadata?.qty, 10) || 0;

    if (!email) { console.error('Webhook: no email in session', session.id); return res.json({ received: true }); }

    const key      = 'stellar:user:' + email.toLowerCase().trim();
    const existing = (await kvGet(key)) || {};

    if (plan === 'topup' && qty > 0) {
      // Credit top-up — add to wallet
      const bonusFor = (p) => p >= 5000 ? Math.round(p * 0.20) : p >= 2000 ? Math.round(p * 0.15) : p >= 1000 ? Math.round(p * 0.10) : p >= 500 ? Math.round(p * 0.05) : 0;
      const bonus = bonusFor(qty);
      await kvSet(key, {
        ...existing,
        walletPence: (existing.walletPence || 0) + qty + bonus,
        updatedAt: Date.now()
      });
      console.log(`Topup: ${email} +£${((qty + bonus) / 100).toFixed(2)}`);

    } else if (plan === 'lite' || plan === 'pro') {
      // Subscription — set plan
      await kvSet(key, {
        ...existing,
        plan,
        updatedAt: Date.now()
      });
      console.log(`Plan upgraded: ${email} → ${plan}`);
    }
  }

  // ── Subscription cancelled / expired ────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const custId = session.customer;
    // Try to find email from customer object
    try {
      const customer = await stripe.customers.retrieve(custId);
      const email = customer.email;
      if (email) {
        const key = 'stellar:user:' + email.toLowerCase().trim();
        const existing = (await kvGet(key)) || {};
        await kvSet(key, { ...existing, plan: 'free', updatedAt: Date.now() });
        console.log(`Plan cancelled: ${email} → free`);
      }
    } catch (e) { console.error('Could not downgrade cancelled sub:', e.message); }
  }

  res.json({ received: true });
}
