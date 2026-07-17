// api/create-checkout.js — Stellar AI
// Creates a Stripe checkout page for Lite (£10/month) or Pro (£30/month)

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { plan, email } = req.body || {};

  let priceId;
  if (plan === 'lite') priceId = process.env.STRIPE_PRICE_ID_LITE;
  else if (plan === 'pro') priceId = process.env.STRIPE_PRICE_ID_PRO;
  else return res.status(400).json({ error: 'Invalid plan' });

  if (!priceId) {
    return res.status(500).json({ error: 'Checkout is not set up yet — coming very soon!' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin}/?success=true&plan=${plan}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: { plan }
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
