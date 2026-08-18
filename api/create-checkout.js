// api/create-checkout.js — signed-in Stripe Checkout for subscriptions and one-time credit top-ups
import { requireSession } from '../lib/auth.js';
import { TOPUP_MAX_PENCE, TOPUP_MIN_PENCE, topupBonusPence } from '../lib/pricing.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const sessionUser = requireSession(req, res);
  if (!sessionUser) return;
  const { plan, amount, qty } = req.body || {};
  if (!plan) return res.status(400).json({ error: 'Choose a plan before continuing.' });

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) return res.status(500).json({ error: 'Stripe is not configured.' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);

    if (plan === 'topup') {
      const pence = Math.round(Number(amount || qty) || 0);
      if (pence < TOPUP_MIN_PENCE || pence > TOPUP_MAX_PENCE) {
        return res.status(400).json({ error: 'Top-up amount must be between 50p and £200.' });
      }

      const bonus = topupBonusPence(pence);
      const checkout = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: sessionUser.email,
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: pence,
            product_data: {
              name: `Stellar AI Credit — £${(pence / 100).toFixed(2)}${bonus ? ` + £${(bonus / 100).toFixed(2)} bonus` : ''}`,
              description: 'Credit never expires and is applied after plan allowance.',
            },
          },
          quantity: 1,
        }],
        success_url: 'https://trystellarai.com/app?payment=success&plan=topup',
        cancel_url: 'https://trystellarai.com/app?payment=cancelled&plan=topup',
        metadata: { email: sessionUser.email, plan: 'topup', amount: String(pence), bonus: String(bonus) },
      });
      return res.status(200).json({ url: checkout.url });
    }

    const prices = {
      lite: process.env.STRIPE_PRICE_ID_LITE,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      'lite-annual': process.env.STRIPE_PRICE_ID_LITE_ANNUAL,
      'pro-annual': process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    };
    const price = prices[plan];
    if (!price) return res.status(400).json({ error: 'That plan is not available.' });

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: sessionUser.email,
      line_items: [{ price, quantity: 1 }],
      success_url: `https://trystellarai.com/app?payment=success&plan=${encodeURIComponent(plan)}`,
      cancel_url: `https://trystellarai.com/app?payment=cancelled&plan=${encodeURIComponent(plan)}`,
      metadata: { email: sessionUser.email, plan },
    });

    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    console.error('Stripe checkout error', error?.message || error);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}
