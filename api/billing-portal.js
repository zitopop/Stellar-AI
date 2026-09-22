// api/billing-portal.js — authenticated Stripe Customer Portal for paid Stellar AI accounts
import Stripe from 'stripe';
import { requireSession } from '../lib/auth.js';
import { kvGet } from '../lib/profile.js';
import { isPaidPlan } from '../lib/pricing.js';

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

async function resolvePortalConfiguration(stripe) {
  const configuredId = String(process.env.STRIPE_BILLING_PORTAL_CONFIG_ID || '').trim();
  if (configuredId) return configuredId;

  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const stellar = existing.data.find((configuration) => configuration.metadata?.app === 'stellar-ai');
  if (stellar) return stellar.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Manage your Stellar AI subscription and payment method.',
      privacy_policy_url: 'https://trystellarai.com/privacy.html',
      terms_of_service_url: 'https://trystellarai.com/terms.html',
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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!kvUrl || !kvToken) return res.status(500).json({ error: 'Account storage is not configured.' });
  if (!stripeSecret) return res.status(500).json({ error: 'Stripe billing is not configured.' });

  try {
    const user = await kvGet(kvUrl, kvToken, `stellar:user:${session.email}`);
    if (!user || !isPaidPlan(user.plan)) {
      return res.status(400).json({ error: 'A paid Stellar plan is required to manage subscription billing.' });
    }

    const customerId = String(user.stripeCustomerId || '').trim();
    if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) {
      return res.status(409).json({ error: 'Your Stripe customer record is still syncing. Please try again shortly or contact support.' });
    }

    const stripe = new Stripe(stripeSecret);
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
  } catch (error) {
    console.error('Billing portal error', error?.message || error);
    return res.status(503).json({
      error: 'Billing management could not open right now. Please try again or contact support@trystellarai.com.',
    });
  }
}
