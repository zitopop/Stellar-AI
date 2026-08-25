// api/create-checkout.js — signed-in Stripe Checkout for subscriptions and one-time credit top-ups
import crypto from 'crypto';
import { requireSession } from '../lib/auth.js';
import { TOPUP_MAX_PENCE, TOPUP_MIN_PENCE, topupBonusPence } from '../lib/pricing.js';
import { createCheckoutAttempt, incrementConversionMetric } from '../lib/conversion-metrics.js';

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

function firstConfiguredPrice(env, ...keys) {
  for (const key of keys) {
    const value = String(env?.[key] || '').trim();
    if (value) return value;
  }
  return '';
}

export function subscriptionPriceForPlan(plan, env = process.env) {
  // Canonical names are listed first. The Starter aliases make configuration
  // resilient to common dashboard naming while never substituting another tier.
  const prices = {
    starter: firstConfiguredPrice(env, 'STRIPE_PRICE_ID_STARTER', 'STRIPE_PRICE_ID_STARTER_MONTHLY', 'STRIPE_STARTER_PRICE_ID', 'STELLAR_STARTER', 'StellarStarter'),
    'starter-annual': firstConfiguredPrice(env, 'STRIPE_PRICE_ID_STARTER_ANNUAL', 'STRIPE_PRICE_ID_STARTER_YEARLY', 'STRIPE_STARTER_ANNUAL_PRICE_ID', 'STELLAR_STARTER_YEAR', 'StellarStarterYear'),
    plus: firstConfiguredPrice(env, 'STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_LITE'),
    'plus-annual': firstConfiguredPrice(env, 'STRIPE_PRICE_ID_PLUS_ANNUAL', 'STRIPE_PRICE_ID_LITE_ANNUAL'),
    lite: firstConfiguredPrice(env, 'STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_LITE'),
    'lite-annual': firstConfiguredPrice(env, 'STRIPE_PRICE_ID_PLUS_ANNUAL', 'STRIPE_PRICE_ID_LITE_ANNUAL'),
    pro: firstConfiguredPrice(env, 'STRIPE_PRICE_ID_PRO'),
    'pro-annual': firstConfiguredPrice(env, 'STRIPE_PRICE_ID_PRO_ANNUAL'),
  };
  return prices[plan] || '';
}

function missingPlanMessage(plan) {
  if (plan === 'starter') return 'Starter monthly checkout is not configured yet. Add the Starter monthly Stripe price ID, then redeploy.';
  if (plan === 'starter-annual') return 'Starter annual checkout is not configured yet. Add the Starter annual Stripe price ID, then redeploy.';
  return 'That plan is not available.';
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
      const attemptId = crypto.randomUUID();
      await createCheckoutAttempt({ id: attemptId, email: sessionUser.email, plan: 'topup' });
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
        cancel_url: `https://trystellarai.com/app?payment=cancelled&plan=topup&attempt=${encodeURIComponent(attemptId)}`,
        client_reference_id: attemptId,
        metadata: { email: sessionUser.email, plan: 'topup', amount: String(pence), bonus: String(bonus) },
      });
      await incrementConversionMetric('checkout-started');
      return res.status(200).json({ url: checkout.url });
    }

    // Price IDs are server-owned. Historic Plus aliases remain supported, but a
    // missing Starter ID must never silently charge a Plus or Pro price.
    const price = subscriptionPriceForPlan(plan);
    if (!price) return res.status(400).json({ error: missingPlanMessage(plan), code: 'PLAN_PRICE_NOT_CONFIGURED' });

    const attemptId = crypto.randomUUID();
    await createCheckoutAttempt({ id: attemptId, email: sessionUser.email, plan });
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: sessionUser.email,
      line_items: [{ price, quantity: 1 }],
      success_url: `https://trystellarai.com/app?payment=success&plan=${encodeURIComponent(plan)}`,
      cancel_url: `https://trystellarai.com/app?payment=cancelled&plan=${encodeURIComponent(plan)}&attempt=${encodeURIComponent(attemptId)}`,
      client_reference_id: attemptId,
      metadata: { email: sessionUser.email, plan },
    });

    await incrementConversionMetric('checkout-started');
    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    console.error('Stripe checkout error', error?.message || error);
    const message = String(error?.message || '');
    if (/No such price|price_[^\s]+ does not exist/i.test(message)) {
      return res.status(400).json({ error: 'This Stripe price was not found in the current Stripe mode. Check that the price ID and STRIPE_SECRET_KEY are both test or both live, then redeploy.', code: 'STRIPE_PRICE_MODE_MISMATCH' });
    }
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}
