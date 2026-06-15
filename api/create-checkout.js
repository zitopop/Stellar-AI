// api/create-checkout.js
// Handles all Stripe checkout sessions for Stellar AI
// Plans: pro (£10/mo), max (£30/mo), ultimate (£50/mo), led (£20 one-time), wallet (top-up)

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const DOMAIN = 'https://trystellarai.com';

// Pre-created Stripe Price IDs — pulled from Vercel environment variables
// Add each one in Vercel: Settings → Environment Variables
const PRICE_IDS = {
  led:      process.env.stellar_ai_led_theme,  // £20 one-time — LED theme
  // pro:   process.env.stellar_ai_pro,        // uncomment when you add it
  // max:   process.env.stellar_ai_max,        // uncomment when you add it
  // ult:   process.env.stellar_ai_ultimate,   // uncomment when you add it
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check (GET) — used by the app to detect if Stripe is configured
  if (req.method === 'GET') {
    return res.json({
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      pricesAutomatic: true,
    });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { mode, amount, email } = req.body || {};

  try {

    // ── Portal (manage/cancel subscription) ──────────────────────────
    if (mode === 'portal') {
      if (!email) return res.status(400).json({ error: 'Email required for portal' });
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (!customers.data.length) {
        return res.json({ error: 'No Stripe customer found for this email' });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: DOMAIN,
      });
      return res.json({ url: session.url });
    }

    // ── LED Theme — one-time £20 ─────────────────────────────────────
    if (mode === 'led') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price: PRICE_IDS.led,
          quantity: 1,
        }],
        success_url: `${DOMAIN}/?theme_unlocked=led`,
        cancel_url: `${DOMAIN}/`,
        metadata: { type: 'led_theme' },
        ...(email && { customer_email: email }),
      });
      return res.json({ url: session.url });
    }

    // ── Wallet top-up — one-time, custom amount ──────────────────────
    if (mode === 'wallet') {
      const pence = parseInt(amount);
      if (!pence || pence < 100) return res.status(400).json({ error: 'Minimum top-up is £1' });
      if (pence > 1000000) return res.status(400).json({ error: 'Maximum top-up is £10,000' });
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: pence,
            product_data: {
              name: `Stellar AI Wallet — £${(pence / 100).toFixed(2)} credit`,
              description: 'Messages cost 10p each once your free bar runs out',
            },
          },
          quantity: 1,
        }],
        success_url: `${DOMAIN}/?credit=${pence}`,
        cancel_url: `${DOMAIN}/`,
        metadata: { type: 'wallet', amount: pence },
        ...(email && { customer_email: email }),
      });
      return res.json({ url: session.url });
    }

    // ── Subscriptions: pro / max / ultimate ──────────────────────────
    const planConfig = {
      pro: {
        name: 'Stellar AI Pro',
        description: 'Power model · bigger bar · all themes · refills every 4h',
        amount: 1000,
        successParam: 'upgraded=pro',
      },
      max: {
        name: 'Stellar AI Max',
        description: 'Ultra model · HD images · Nebula theme · refills every 2h',
        amount: 3000,
        successParam: 'upgraded=max',
      },
      ultimate: {
        name: 'Stellar AI Ultimate',
        description: 'Max Ultra usage · Supernova theme · refills every hour',
        amount: 5000,
        successParam: 'upgraded=ultimate',
      },
    };

    const plan = planConfig[mode];
    if (!plan) return res.status(400).json({ error: `Unknown mode: ${mode}` });

    // Use pre-created Price ID if available, otherwise inline price_data
    const lineItem = PRICE_IDS[mode]
      ? { price: PRICE_IDS[mode], quantity: 1 }
      : {
          price_data: {
            currency: 'gbp',
            unit_amount: plan.amount,
            recurring: { interval: 'month' },
            product_data: {
              name: plan.name,
              description: plan.description,
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [lineItem],
      success_url: `${DOMAIN}/?${plan.successParam}`,
      cancel_url: `${DOMAIN}/`,
      metadata: { plan: mode },
      ...(email && { customer_email: email }),
    });

    return res.json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
