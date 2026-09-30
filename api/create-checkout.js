// api/create-checkout.js — signed-in Stripe Checkout for subscriptions and one-time credit top-ups
import crypto from 'crypto';
import { requireSession } from '../lib/auth.js';
import { isPaidPlan } from '../lib/pricing.js';
import { kvGet } from '../lib/profile.js';
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

export const LIVE_GBP_SUBSCRIPTION_PRICES = Object.freeze({
  starter: 'price_1U8G7CF96AiVlq46BxkhSgQe',
  'starter-annual': 'price_1U8G9PF96AiVlq46J3nJNCvb',
  plus: 'price_1U52CPF96AiVlq46HVEhIOA1',
  'plus-annual': 'price_1U8GR6F96AiVlq46mzzMacgd',
  pro: 'price_1U52DaF96AiVlq46CHTs7IaY',
  'pro-annual': 'price_1U8GSmF96AiVlq462eXffRzP',
});

export function liveSubscriptionPriceForPlan(plan, currency = 'GBP') {
  const code = String(currency || 'GBP').trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (code !== 'GBP') return '';
  return LIVE_GBP_SUBSCRIPTION_PRICES[plan] || '';
}

export function subscriptionPriceForPlan(plan, env = process.env, currency = 'GBP') {
  // Local prices remain supported for internal compatibility, but the live checkout handler
  // deliberately passes GBP so a customer's location cannot switch the billing currency.
  const code = String(currency || 'GBP').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const suffix = code && code !== 'GBP' ? `_${code}` : '';
  const local = (base, localBase) => firstConfiguredPrice(env, ...localBase.map((key) => `${key}${suffix}`), ...base);
  const prices = {
    starter: local(['STRIPE_PRICE_ID_STARTER', 'STRIPE_PRICE_ID_STARTER_MONTHLY', 'STRIPE_STARTER_PRICE_ID', 'STELLAR_STARTER', 'StellarStarter'], ['STRIPE_PRICE_ID_STARTER', 'STRIPE_PRICE_ID_STARTER_MONTHLY']),
    'starter-annual': local(['STRIPE_PRICE_ID_STARTER_ANNUAL', 'STRIPE_PRICE_ID_STARTER_YEARLY', 'STRIPE_STARTER_ANNUAL_PRICE_ID', 'STELLAR_STARTER_YEAR', 'StellarStarterYear'], ['STRIPE_PRICE_ID_STARTER_ANNUAL', 'STRIPE_PRICE_ID_STARTER_YEARLY']),
    plus: local(['STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_PLUS_MONTHLY', 'STRIPE_PLUS_PRICE_ID', 'STRIPE_PRICE_ID_LITE'], ['STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_PLUS_MONTHLY']),
    'plus-annual': local(['STRIPE_PRICE_ID_PLUS_ANNUAL', 'STRIPE_PRICE_ID_PLUS_YEARLY', 'STRIPE_PLUS_ANNUAL_PRICE_ID', 'STRIPE_PRICE_ID_LITE_ANNUAL'], ['STRIPE_PRICE_ID_PLUS_ANNUAL', 'STRIPE_PRICE_ID_PLUS_YEARLY']),
    lite: local(['STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_PLUS_MONTHLY', 'STRIPE_PLUS_PRICE_ID', 'STRIPE_PRICE_ID_LITE'], ['STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_PLUS_MONTHLY']),
    'lite-annual': local(['STRIPE_PRICE_ID_PLUS_ANNUAL', 'STRIPE_PRICE_ID_PLUS_YEARLY', 'STRIPE_PLUS_ANNUAL_PRICE_ID', 'STRIPE_PRICE_ID_LITE_ANNUAL'], ['STRIPE_PRICE_ID_PLUS_ANNUAL', 'STRIPE_PRICE_ID_PLUS_YEARLY']),
    pro: local(['STRIPE_PRICE_ID_PRO', 'STRIPE_PRICE_ID_PRO_MONTHLY', 'STRIPE_PRO_PRICE_ID'], ['STRIPE_PRICE_ID_PRO', 'STRIPE_PRICE_ID_PRO_MONTHLY']),
    'pro-annual': local(['STRIPE_PRICE_ID_PRO_ANNUAL', 'STRIPE_PRICE_ID_PRO_YEARLY', 'STRIPE_PRO_ANNUAL_PRICE_ID'], ['STRIPE_PRICE_ID_PRO_ANNUAL', 'STRIPE_PRICE_ID_PRO_YEARLY']),
  };
  return prices[plan] || '';
}

async function resolvePortalConfiguration(stripe) {
  const configuredId = String(process.env.STRIPE_BILLING_PORTAL_CONFIG_ID || '').trim();
  if (configuredId) return configuredId;

  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const stellar = existing.data.find((configuration) => configuration.metadata?.app === 'stellar-ai');
  if (stellar) return stellar.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your Stellar AI subscription and payment method.',
      privacy_policy_url: 'https://trystellarai.com/privacy',
      terms_of_service_url: 'https://trystellarai.com/terms',
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ['email', 'name'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: ['too_expensive', 'missing_features', 'unused', 'too_complex', 'switched_service', 'low_quality', 'customer_service', 'other'],
        },
      },
      // Plan changes remain in Stellar Checkout so historic Stripe prices can
      // never be offered accidentally through the generic portal.
      subscription_update: { enabled: false },
    },
    metadata: { app: 'stellar-ai', purpose: 'customer-billing' },
  }, { idempotencyKey: 'stellar-ai-billing-portal-v1' });

  return created.id;
}

function missingPlanMessage(plan) {
  const messages = {
    starter: 'Starter monthly checkout is not configured yet. Add the Starter monthly Stripe price ID, then redeploy.',
    'starter-annual': 'Starter annual checkout is not configured yet. Add the Starter annual Stripe price ID, then redeploy.',
    plus: 'Plus monthly checkout is not configured yet. Add the Plus monthly Stripe price ID, then redeploy.',
    'plus-annual': 'Plus annual checkout is not configured yet. Add the Plus annual Stripe price ID, then redeploy.',
    pro: 'Pro monthly checkout is not configured yet. Add the Pro monthly Stripe price ID, then redeploy.',
    'pro-annual': 'Pro annual checkout is not configured yet. Add the Pro annual Stripe price ID, then redeploy.',
  };
  return messages[plan] || 'That plan is not available.';
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const sessionUser = requireSession(req, res);
  if (!sessionUser) return;
  const { plan, amount, qty, country: requestedCountry } = req.body || {};
  const headerCountry = String(req.headers['x-vercel-ip-country'] || req.headers['x-country'] || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : (/^[A-Z]{2}$/.test(String(requestedCountry || '').toUpperCase()) ? String(requestedCountry).toUpperCase() : 'GB');
  // GBP is the base price currency; eligible subscription checkouts use Stripe Adaptive Pricing for local presentment.
  const currency = 'GBP';
  if (!plan) return res.status(400).json({ error: 'Choose a plan before continuing.' });

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) return res.status(500).json({ error: 'Stripe is not configured.' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    const accountUser = kvUrl && kvToken
      ? await kvGet(kvUrl, kvToken, `stellar:user:${sessionUser.email}`)
      : null;
    const existingCustomerId = String(accountUser?.stripeCustomerId || '').trim();
    const checkoutCustomer = /^cus_[A-Za-z0-9]+$/.test(existingCustomerId)
      ? { customer: existingCustomerId }
      : { customer_email: sessionUser.email };

    if (plan === 'manage-billing') {
      if (!kvUrl || !kvToken) return res.status(500).json({ error: 'Account storage is not configured.' });
      const user = accountUser;
      if (!user || !isPaidPlan(user.plan)) {
        return res.status(400).json({ error: 'A paid Stellar plan is required to manage subscription billing.' });
      }

      const customerId = String(user.stripeCustomerId || '').trim();
      if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) {
        return res.status(409).json({ error: 'Your Stripe customer record is still syncing. Please try again shortly or contact support.' });
      }

      const configuration = await resolvePortalConfiguration(stripe);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        configuration,
        return_url: 'https://trystellarai.com/app',
      });

      if (!portal?.url || !/^https:\/\/billing\.stripe\.com\//i.test(portal.url)) {
        throw new Error('Stripe returned an invalid billing portal URL.');
      }
      return res.status(200).json({ url: portal.url });
    }

    if (plan === 'website-builder') {
      const attemptId = crypto.randomUUID();
      await createCheckoutAttempt({ id: attemptId, email: sessionUser.email, plan: 'website-builder' });
      const checkout = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        ...checkoutCustomer,
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: 9900,
            product_data: {
              name: 'Stellar AI Business Website Package',
              description: 'One-time access to the Stellar AI Business Website Builder for an approved business website project, including AI generation, preview, refinement and HTML download.',
            },
          },
          quantity: 1,
        }],
        success_url: 'https://trystellarai.com/business-builder?payment=success',
        cancel_url: `https://trystellarai.com/business-builder?payment=cancelled&attempt=${encodeURIComponent(attemptId)}`,
        after_expiration: { recovery: { enabled: true } },
        client_reference_id: attemptId,
        metadata: {
          email: sessionUser.email,
          plan: 'website-builder',
          amount: '9900',
          country,
          currency,
        },
        payment_intent_data: {
          metadata: {
            email: sessionUser.email,
            plan: 'website-builder',
            amount: '9900',
          },
        },
      });
      await incrementConversionMetric('checkout-started');
      return res.status(200).json({ url: checkout.url });
    }

    if (plan === 'topup') {
      return res.status(410).json({ error: 'Usage top-ups are no longer sold. Choose a plan with the usage capacity you need.' });
    }

    // Never create a second recurring subscription for an account that already has one.
    const existingSubscriptionId = String(accountUser?.stripeSubscriptionId || '').trim();
    if (isPaidPlan(accountUser?.plan) && /^sub_[A-Za-z0-9]+$/.test(existingSubscriptionId)) {
      return res.status(409).json({
        error: 'This account already has an active Stellar subscription. Open Manage billing before starting another plan checkout.',
        code: 'ACTIVE_SUBSCRIPTION_EXISTS',
      });
    }

    // Price IDs are server-owned. Historic Plus aliases remain supported, but a
    // missing Starter ID must never silently charge a Plus or Pro price.
    // Production GBP checkout is pinned to the exact live Stripe prices advertised
    // on /plans. Environment aliases remain a compatibility fallback for non-live
    // deployments, but cannot silently switch a customer onto an old GBP price.
    const price = liveSubscriptionPriceForPlan(plan, currency)
      || subscriptionPriceForPlan(plan, process.env, currency);
    if (!price) return res.status(400).json({ error: missingPlanMessage(plan), code: 'PLAN_PRICE_NOT_CONFIGURED', country, currency });

    const attemptId = crypto.randomUUID();
    await createCheckoutAttempt({ id: attemptId, email: sessionUser.email, plan });
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ...checkoutCustomer,
      line_items: [{ price, quantity: 1 }],
      success_url: `https://trystellarai.com/app?payment=success&plan=${encodeURIComponent(plan)}`,
      cancel_url: `https://trystellarai.com/app?payment=cancelled&plan=${encodeURIComponent(plan)}&attempt=${encodeURIComponent(attemptId)}`,
      after_expiration: { recovery: { enabled: true } },
      client_reference_id: attemptId,
      metadata: { email: sessionUser.email, plan, country, currency },
      subscription_data: {
        metadata: { email: sessionUser.email, plan, app: 'stellar-ai' },
      },
      adaptive_pricing: { enabled: true },
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
