import { loadBusinessFulfillmentJob, businessServiceFromCheckout } from '../lib/business-fulfillment.js';
import { kvGet } from '../lib/profile.js';
import { normalisePlan } from '../lib/pricing.js';

function setHeaders(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Vary', 'Origin');
}

function productFromSession(session = {}) {
  const service = businessServiceFromCheckout(session);
  if (service === 'website_mini_audit') return { id: 'website-audit', label: 'Website Audit / Quick Fix', kind: 'service' };
  if (service === 'ai_receptionist') return { id: 'ai-receptionist', label: 'AI Receptionist', kind: 'service' };
  const plan = String(session?.metadata?.plan || '').trim().toLowerCase();
  if (plan === 'website-builder') return { id: plan, label: 'AI Business Website', kind: 'one-time' };
  if (plan === 'server-pass') return { id: plan, label: 'Server Pass', kind: 'subscription' };
  const normalized = normalisePlan(plan);
  if (normalized) {
    const labels = { free: 'Free', starter: 'Starter', plus: 'Plus', pro: 'Pro' };
    return { id: normalized, label: 'Stellar ' + (labels[normalized] || normalized), kind: 'subscription' };
  }
  return null;
}

function serviceMessage(status, label) {
  if (status === 'delivered') return { ready: true, title: label + ' is ready', message: 'Your completed audit has been sent to the email used at checkout.' };
  if (status === 'live') return { ready: true, title: label + ' is live', message: 'Your receptionist has been provisioned and the live link has been sent to the email used at checkout.' };
  if (status === 'waiting_for_customer') return { ready: false, actionRequired: true, title: 'One detail is needed', message: 'Check your email for a secure Stellar link. Fulfilment resumes automatically after you confirm the missing information.' };
  if (status === 'needs_owner_review') return { ready: false, title: 'Stellar is reviewing this order', message: 'Automatic recovery could not finish this order. Stellar support has been alerted; your payment and order record are preserved.' };
  if (status === 'retrying') return { ready: false, title: 'Still processing', message: 'Stellar is retrying the fulfilment automatically. You do not need to buy again.' };
  if (status === 'processing' || status === 'qa_processing') return { ready: false, title: 'Your order is being prepared', message: 'Payment is confirmed and Stellar is processing the paid service automatically.' };
  return { ready: false, title: 'Payment confirmed', message: 'Your paid order is queued for automatic fulfilment.' };
}

async function entitlementStatus(product, session, env) {
  const email = String(session?.metadata?.email || session?.customer_details?.email || session?.customer_email || '').trim().toLowerCase();
  const url = String(env.KV_REST_API_URL || '').trim();
  const token = String(env.KV_REST_API_TOKEN || '').trim();
  if (!email || !url || !token) return { ready: false, status: 'provisioning' };

  if (product.id === 'website-builder') {
    const value = await kvGet(url, token, `stellar:website-builder:${email}`).catch(() => null);
    const ready = value?.status === 'active' && Boolean(value?.checkoutSessionId);
    return {
      ready,
      status: ready ? 'ready' : 'provisioning',
      title: ready ? 'Website Builder unlocked' : 'Unlocking Website Builder',
      message: ready ? 'Your £99 website package is active on the purchasing Stellar account.' : 'Payment is confirmed. Stellar is syncing the website-builder entitlement now.',
    };
  }

  if (product.id === 'server-pass') {
    const value = await kvGet(url, token, `stellar:server-pass:${email}`).catch(() => null);
    const status = String(value?.status || '').toLowerCase();
    const ready = status === 'pending_activation' || status === 'active';
    return {
      ready,
      status: ready ? status : 'provisioning',
      title: status === 'active' ? 'Server Pass active' : ready ? 'Server Pass ready to activate' : 'Preparing Server Pass',
      message: status === 'active'
        ? 'Your verified Discord guild is active.'
        : ready
          ? 'Connect Discord to the purchasing Stellar account, then run /serverpass in the server you manage.'
          : 'Payment is confirmed. Stellar is syncing the Server Pass entitlement now.',
    };
  }

  if (['starter', 'plus', 'pro'].includes(product.id)) {
    const value = await kvGet(url, token, `stellar:user:${email}`).catch(() => null);
    const activePlan = normalisePlan(value?.plan);
    const ready = activePlan === product.id;
    return {
      ready,
      status: ready ? 'ready' : 'provisioning',
      title: ready ? product.label + ' is active' : 'Activating ' + product.label,
      message: ready ? 'Your paid plan is active on the purchasing Stellar account.' : 'Payment is confirmed and the account entitlement is syncing.',
    };
  }

  return { ready: false, status: 'provisioning' };
}

export default async function handler(req, res) {
  setHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const sessionId = String(req.query?.session_id || req.query?.sessionId || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'A valid checkout session is required.' });
  const secret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) return res.status(503).json({ error: 'Purchase verification is temporarily unavailable.' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const product = productFromSession(session);
    if (!product || (session.metadata?.app && session.metadata.app !== 'stellar-ai')) {
      return res.status(404).json({ error: 'This checkout does not belong to a supported Stellar purchase.' });
    }

    const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!paid) {
      const expired = session.status === 'expired';
      return res.status(200).json({
        ok: true,
        product,
        payment: expired ? 'expired' : 'pending',
        status: expired ? 'expired' : 'payment_pending',
        ready: false,
        actionRequired: false,
        title: expired ? 'Checkout expired' : 'Payment is still processing',
        message: expired ? 'This checkout expired and did not create access. Start a new checkout if you still want the product.' : 'Stripe has not confirmed payment yet. Do not pay again while the checkout is still processing.',
      });
    }

    if (product.kind === 'service') {
      const job = await loadBusinessFulfillmentJob(session.id).catch(() => null);
      const jobStatus = String(job?.status || 'queued');
      const detail = serviceMessage(jobStatus, product.label);
      return res.status(200).json({
        ok: true,
        product,
        payment: 'paid',
        status: jobStatus,
        ready: detail.ready,
        actionRequired: detail.actionRequired === true,
        title: detail.title,
        message: detail.message,
      });
    }

    const entitlement = await entitlementStatus(product, session, process.env);
    return res.status(200).json({
      ok: true,
      product,
      payment: 'paid',
      status: entitlement.status,
      ready: entitlement.ready === true,
      actionRequired: false,
      title: entitlement.title || 'Payment confirmed',
      message: entitlement.message || 'Your Stellar purchase is being provisioned automatically.',
    });
  } catch (error) {
    console.error('Purchase status failed', error?.message || error);
    return res.status(503).json({ error: 'Purchase status could not be verified right now. Your Stripe receipt remains the payment record.' });
  }
}
