// api/webhook.js — Stripe webhook handler
// Stores subscription access and paid top-ups in the same KV user record used by the app.

import Stripe from 'stripe';
import { timingSafeEqual } from 'node:crypto';
import { refundedTopupCreditDelta, rememberRefundedCharge, subscriptionHasAccess, subscriptionShouldRevoke } from '../lib/billing-lifecycle.js';
import { TOPUP_MAX_PENCE, TOPUP_MIN_PENCE, normalisePlan } from '../lib/pricing.js';
import { applyTopupCheckout } from '../lib/topup.js';
import { recordFirstUpgrade } from '../lib/profile.js';
import { incrementConversionMetric, recordCheckoutCompletion, recordCheckoutExpiry } from '../lib/conversion-metrics.js';
import { escalateOwner } from '../lib/owner-escalation.js';
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { getGmailPushConfiguration, getGmailWatchStatus, processGmailPush, startGmailWatch } from '../lib/gmail-push.js';
import { deliverQStashReminder, QStashReminderError } from '../lib/qstash-reminders.js';
import { businessServiceFromCheckout, createBusinessFulfillmentJob, enqueueBusinessFulfillment, deliverBusinessFulfillment, subscriptionHasAiReceptionist, invoiceHasAiReceptionist, updateBusinessServiceBilling } from '../lib/business-fulfillment.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const ATTRIBUTION_SOURCES = new Set(['direct','github','cfx','builtbybit','google','discord','other']);
function acquisitionSource(value) { const source = String(value || '').trim().toLowerCase(); return ATTRIBUTION_SOURCES.has(source) ? source : 'direct'; }

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function gmailPushAuthorized(req) {
  const expected = String(process.env.GMAIL_PUSH_TOKEN || '').trim();
  if (!expected) return false;
  const supplied = String(req.headers['x-gmail-push-token'] || req.query?.token || '').trim();
  return secureEqual(expected, supplied);
}

function internalAuthorized(req) {
  const authorization = String(req.headers.authorization || '');
  const cronSecret = String(process.env.CRON_SECRET || '').trim();
  if (cronSecret && secureEqual(authorization, `Bearer ${cronSecret}`)) return true;
  const bridgeToken = String(process.env.CALL_BRIDGE_TOKEN || '').trim();
  const suppliedBridgeToken = String(req.headers['x-call-bridge-token'] || '').trim();
  return Boolean(bridgeToken && secureEqual(suppliedBridgeToken, bridgeToken));
}

function ownerAuthorized(req, res) {
  const session = requireSession(req, res);
  if (!session) return false;
  if (!isOwnerEmail(session.email)) {
    res.status(403).json({ error: 'Owner access is required.' });
    return false;
  }
  return true;
}

async function handleGmailPush(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!gmailPushAuthorized(req)) return res.status(403).json({ error: 'Invalid Gmail push token.' });
  try {
    const result = await processGmailPush(await readJsonBody(req));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Gmail push processing failed', error?.message || error);
    return res.status(500).json({ error: 'Gmail notification could not be processed.' });
  }
}

async function handleQStashReminder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const rawBody = (await readRawBody(req)).toString('utf8');
  try {
    const result = await deliverQStashReminder({
      rawBody,
      signature: req.headers['upstash-signature'],
      upstashRegion: req.headers['upstash-region'],
      dispatch: escalateOwner,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof QStashReminderError ? error.status : 503;
    if (status >= 500) console.error('QStash reminder delivery failed', error?.message || error);
    return res.status(status).json({
      error: status === 403 ? 'Invalid QStash signature.' : (error instanceof QStashReminderError ? error.message : 'Urgent reminder delivery is unavailable.'),
    });
  }
}


async function handleBusinessFulfillment(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const rawBody = (await readRawBody(req)).toString('utf8');
  try {
    const result = await deliverBusinessFulfillment({
      rawBody,
      signature: req.headers['upstash-signature'],
      upstashRegion: req.headers['upstash-region'],
    });
    return res.status(200).json({ ok: true, status: result?.status || result?.job?.status || 'processed', duplicate: result?.duplicate === true });
  } catch (error) {
    const status = Math.max(400, Math.min(503, Number(error?.status) || 503));
    if (status >= 500) console.error('Business fulfilment worker failed', error?.message || error);
    return res.status(status).json({ error: String(error?.message || 'Business fulfilment worker failed.').slice(0, 240) });
  }
}

async function handleGmailWatch(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  const internal = internalAuthorized(req);
  if (!internal && !ownerAuthorized(req, res)) return;
  try {
    const body = req.method === 'POST' ? await readJsonBody(req) : {};
    const action = req.method === 'GET' ? 'start' : String(body?.action || 'status').trim().toLowerCase();
    if (action === 'status') return res.status(200).json({ ok: true, ...(await getGmailWatchStatus()) });
    if (action === 'start' || action === 'renew') {
      const config = await getGmailPushConfiguration();
      if (!config.gmailConfigured || !config.storageConfigured || !config.topicConfigured) {
        return res.status(200).json({
          ok: true,
          active: false,
          skipped: true,
          reason: 'not-configured',
          configuration: config,
          status: await getGmailWatchStatus(),
        });
      }
      const watch = await startGmailWatch();
      return res.status(200).json({ ok: true, watch, status: await getGmailWatchStatus() });
    }
    return res.status(400).json({ error: 'Unknown Gmail watch action.' });
  } catch (error) {
    const message = String(error?.message || '');
    if (/Gmail OAuth is not configured|Gmail token refresh failed/i.test(message)) {
      console.warn('Gmail watch skipped until OAuth is ready');
      return res.status(200).json({ ok: true, active: false, skipped: true, reason: 'oauth-not-ready' });
    }
    console.error('Gmail watch action failed', message || error);
    return res.status(502).json({ error: message || 'Gmail watch could not be updated.' });
  }
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

async function kvSetNx(key, value, seconds = 300) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify(value), 'EX', seconds, 'NX']]),
    });
    if (!response.ok) return null;
    const results = await response.json();
    return results?.[0]?.result === 'OK';
  } catch {
    return null;
  }
}

async function kvDelete(key) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['DEL', key]]),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function eventKey(eventId) {
  return `stellar:stripe-event:${eventId}`;
}

function stripeObjectId(value, prefix) {
  const id = typeof value === 'string' ? value : String(value?.id || '');
  return id.startsWith(prefix) ? id : '';
}

function knownCheckoutPlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return ['website-builder', 'server-pass', 'topup'].includes(plan) || Boolean(normalisePlan(plan));
}

async function customerEmail(stripe, customer) {
  if (customer && typeof customer === 'object' && !customer.deleted) {
    return String(customer.email || '').toLowerCase().trim();
  }
  if (typeof customer !== 'string' || !customer.startsWith('cus_')) return '';
  const record = await stripe.customers.retrieve(customer);
  return record && !record.deleted ? String(record.email || '').toLowerCase().trim() : '';
}

function subscriptionBilling(plan) {
  return String(plan || '').toLowerCase().endsWith('-annual') ? 'annual' : 'monthly';
}

export default async function handler(req, res) {
  const source = String(req.query?.source || '').trim().toLowerCase();
  if (source === 'gmail-push') return handleGmailPush(req, res);
  if (source === 'gmail-watch') return handleGmailWatch(req, res);
  if (source === 'qstash-reminder') return handleQStashReminder(req, res);
  if (source === 'business-fulfillment') return handleBusinessFulfillment(req, res);
  if (req.method !== 'POST') return res.status(405).end();
  if (!STRIPE_SECRET || !WEBHOOK_SECRET) return res.status(500).json({ error: 'Stripe webhook is not configured.' });
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'Account storage is not configured.' });

  let event;
  let eventClaimed = false;
  try {
    const stripe = new Stripe(STRIPE_SECRET);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(await readRawBody(req), signature, WEBHOOK_SECRET);

    // Claim the event atomically before processing so concurrent Stripe retries cannot
    // apply the same entitlement transition twice. Failed handlers release the claim.
    const eventClaim = await kvSetNx(eventKey(event.id), { state: 'processing', receivedAt: Date.now(), type: event.type }, 300);
    if (eventClaim === null) throw new Error(`Could not claim Stripe event ${event.id}`);
    if (!eventClaim) {
      const existingEvent = await kvGet(eventKey(event.id));
      if (existingEvent?.state === 'completed') return res.status(200).json({ received: true, duplicate: true });
      return res.status(409).json({ error: 'Stripe event is already processing; retry later.' });
    }
    eventClaimed = true;

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      const email = String(session.metadata?.email || session.customer_details?.email || session.customer_email || '').toLowerCase().trim();
      const checkoutPlan = String(session.metadata?.plan || '').trim().toLowerCase();
      const businessService = businessServiceFromCheckout(session);
      const sourceName = acquisitionSource(session.metadata?.acquisition_source);
      const userKey = email ? `stellar:user:${email}` : '';
      const checkoutCustomerId = stripeObjectId(session.customer, 'cus_');
      const checkoutSubscriptionId = stripeObjectId(session.subscription, 'sub_');
      const isSubscriptionCheckout = checkoutPlan === 'server-pass' || Boolean(normalisePlan(checkoutPlan));

      if (businessService) {
        const job = await createBusinessFulfillmentJob(session);
        if (job) {
          const queued = await enqueueBusinessFulfillment(job).catch((error) => ({ queued: false, reason: String(error?.message || error).slice(0, 120) }));
          if (!queued?.queued) console.warn('Paid business order saved but background fulfilment was not queued', session.id, queued?.reason || 'unknown');
          await Promise.all([
            incrementConversionMetric('checkout-completed'),
            incrementConversionMetric('business-service-completed'),
            incrementConversionMetric(`business-service-${businessService}-completed`),
            incrementConversionMetric('revenue-pence', Number(session.amount_total || 0)),
          ]);
          if (businessService === 'ai_receptionist') {
            await updateBusinessServiceBilling(email, {
              status: 'setup_queued',
              checkoutSessionId: session.id,
              stripeCustomerId: checkoutCustomerId || null,
              stripeSubscriptionId: checkoutSubscriptionId || null,
              subscriptionStatus: 'active',
            });
          }
        } else {
          console.info('Stripe business checkout is awaiting payment', businessService, session.id);
        }
      } else if (!knownCheckoutPlan(checkoutPlan) && session.metadata?.app !== 'stellar-ai') {
        console.info('Ignoring unrelated Stripe Checkout session', session.id);
      } else if (!knownCheckoutPlan(checkoutPlan)) {
        throw new Error(`Stripe Checkout session ${session.id} has missing or invalid Stellar plan metadata`);
      } else if (!email) {
        throw new Error(`Stripe Checkout session ${session.id} is missing a customer email`);
      } else if (isSubscriptionCheckout && (!checkoutCustomerId || !checkoutSubscriptionId)) {
        throw new Error(`Stripe subscription Checkout session ${session.id} is missing customer or subscription identifiers`);
      } else {
        const existing = (await kvGet(userKey)) || {};

        if (checkoutPlan === 'website-builder') {
          const amount = Math.round(Number(session.metadata?.amount || 0));
          const paid = session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded';
          const amountMatches = Number(session.amount_total) === 9900 && amount === 9900;
          if (!paid) {
            console.info('Stripe website-builder checkout is awaiting payment', session.id);
          } else {
            if (!amountMatches) throw new Error(`Invalid completed website-builder session ${session.id}`);
            const saved = await kvSet(`stellar:website-builder:${email}`, {
              status: 'active',
              checkoutSessionId: session.id,
              paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '',
              amountPence: 9900,
              purchasedAt: Date.now(),
            });
            if (!saved) throw new Error(`Could not persist website-builder entitlement for ${session.id}`);
            await Promise.all([
              recordCheckoutCompletion({ id: String(session.client_reference_id || '') }),
              incrementConversionMetric('checkout-completed'),
              incrementConversionMetric(`checkout-completed-source-${sourceName}`),
              incrementConversionMetric('website-builder-completed'),
              incrementConversionMetric('revenue-pence', 9900),
            ]);
          }
        } else if (checkoutPlan === 'server-pass') {
          const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required' || event.type === 'checkout.session.async_payment_succeeded';
          const amountMatches = Number(session.amount_total) === 5000 && Number(session.metadata?.amount || 0) === 5000;
          if (!paid) {
            console.info('Stripe Server Pass checkout is awaiting payment', session.id);
          } else {
            if (!amountMatches) throw new Error(`Invalid completed Server Pass session ${session.id}`);
            const existingPass = (await kvGet(`stellar:server-pass:${email}`)) || {};
            const saved = await kvSet(`stellar:server-pass:${email}`, {
              ...existingPass,
              status: existingPass.guildId ? 'active' : 'pending_activation',
              checkoutSessionId: session.id,
              stripeCustomerId: checkoutCustomerId || existingPass.stripeCustomerId,
              stripeSubscriptionId: checkoutSubscriptionId || existingPass.stripeSubscriptionId,
              amountPence: 5000,
              billing: 'monthly',
              purchasedAt: Number(existingPass.purchasedAt) || Date.now(),
              updatedAt: Date.now(),
            });
            if (!saved) throw new Error(`Could not persist Server Pass entitlement for ${session.id}`);
            await Promise.all([
              recordCheckoutCompletion({ id: String(session.client_reference_id || '') }),
              incrementConversionMetric('checkout-completed'),
              incrementConversionMetric(`checkout-completed-source-${sourceName}`),
              incrementConversionMetric('server-pass-completed'),
              incrementConversionMetric('revenue-pence', 5000),
            ]);
          }
        } else if (checkoutPlan === 'topup') {
          const amount = Math.round(Number(session.metadata?.amount || session.metadata?.qty || 0));
          const paid = session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded';
          const amountMatches = Number(session.amount_total) === amount;
          if (!paid) {
            console.info('Stripe top-up checkout is awaiting payment', session.id);
          } else {
            if (!amountMatches || amount < TOPUP_MIN_PENCE || amount > TOPUP_MAX_PENCE || amount % 50 !== 0) {
              throw new Error(`Invalid completed top-up session ${session.id}`);
            }
            const result = applyTopupCheckout(existing, {
              sessionId: session.id,
              amountPence: amount,
              customerId: typeof session.customer === 'string' ? session.customer : '',
            });
            if (result.applied) {
              const saved = await kvSet(userKey, result.record);
              if (!saved) throw new Error(`Could not persist top-up for ${session.id}`);
              await Promise.all([
                recordCheckoutCompletion({ id: String(session.client_reference_id || '') }),
                incrementConversionMetric('checkout-completed'),
                incrementConversionMetric(`checkout-completed-source-${sourceName}`),
                incrementConversionMetric('topup-completed'),
                incrementConversionMetric('revenue-pence', Number(session.amount_total || amount)),
              ]);
            }
          }
        } else {
          const plan = normalisePlan(checkoutPlan);
          const subscriptionPaid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required' || event.type === 'checkout.session.async_payment_succeeded';
          if (plan && subscriptionPaid) {
            const saved = await kvSet(userKey, {
              ...existing,
              plan,
              planBilling: subscriptionBilling(checkoutPlan),
              planCreditAnchorAt: Date.now(),
              stripeCustomerId: checkoutCustomerId || existing.stripeCustomerId,
              stripeSubscriptionId: checkoutSubscriptionId || existing.stripeSubscriptionId,
              stripeSubscriptionStatus: 'active',
              billingPaymentFailedAt: null,
              updatedAt: Date.now(),
            });
            if (!saved) throw new Error(`Could not persist subscription entitlement for ${session.id}`);
            await Promise.all([
              recordCheckoutCompletion({ id: String(session.client_reference_id || '') }),
              incrementConversionMetric('checkout-completed'),
              incrementConversionMetric(`checkout-completed-source-${sourceName}`),
              incrementConversionMetric('subscription-completed'),
              incrementConversionMetric('revenue-pence', Number(session.amount_total || 0)),
              recordFirstUpgrade(KV_URL, KV_TOKEN, email),
            ]);
          } else if (!plan) {
            console.error('Stripe checkout completed with an unknown plan', checkoutPlan, session.id);
          } else {
            console.info('Stripe subscription checkout is awaiting payment', session.payment_status, session.id);
          }
        }
      }
    } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const subscriptionCustomerId = stripeObjectId(subscription.customer, 'cus_');
      if (!subscriptionCustomerId) throw new Error(`Stripe subscription ${subscription.id} is missing a customer identifier`);
      const email = String(subscription.metadata?.email || '').toLowerCase().trim() || await customerEmail(stripe, subscription.customer);
      if (!email) throw new Error(`Stripe subscription ${subscription.id} could not be mapped to a customer email`);
      if (subscriptionHasAiReceptionist(subscription)) {
        const status = String(subscription.status || '').toLowerCase();
        const hasAccess = subscriptionHasAccess(status);
        await updateBusinessServiceBilling(email, {
          status: hasAccess ? 'active' : 'inactive',
          stripeCustomerId: subscriptionCustomerId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: status,
          billingActive: hasAccess,
        });
      } else if ( String(subscription.metadata?.plan || '').toLowerCase() === 'server-pass') {
        const key = `stellar:server-pass:${email}`;
        const existingPass = (await kvGet(key)) || {};
        const status = String(subscription.status || '').toLowerCase();
        const hasAccess = subscriptionHasAccess(status);
        const saved = await kvSet(key, {
          ...existingPass,
          status: hasAccess ? (existingPass.guildId ? 'active' : 'pending_activation') : 'inactive',
          stripeCustomerId: subscriptionCustomerId || existingPass.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: status,
          updatedAt: Date.now(),
        });
        if (!saved) throw new Error(`Could not sync Server Pass subscription ${subscription.id}`);
      } else if (email) {
        const userKey = `stellar:user:${email}`;
        const existing = (await kvGet(userKey)) || {};
        const status = String(subscription.status || '').toLowerCase();
        const metadataPlan = normalisePlan(subscription.metadata?.plan);
        const currentPlan = metadataPlan || normalisePlan(existing.plan) || 'free';
        let next = {
          ...existing,
          stripeCustomerId: subscriptionCustomerId || existing.stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: status,
          updatedAt: Date.now(),
        };
        if (subscriptionShouldRevoke(status)) {
          next = {
            ...next,
            plan: 'free',
            planBilling: null,
            planCreditAnchorAt: null,
          };
        } else if (subscriptionHasAccess(status) && currentPlan !== 'free') {
          next = {
            ...next,
            plan: currentPlan,
            planBilling: metadataPlan ? subscriptionBilling(subscription.metadata?.plan) : (existing.planBilling || 'monthly'),
          };
        }
        const saved = await kvSet(userKey, next);
        if (!saved) throw new Error(`Could not sync subscription ${subscription.id}`);
      }
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const email = await customerEmail(stripe, invoice.customer);
      if (email && invoiceHasAiReceptionist(invoice)) {
        await updateBusinessServiceBilling(email, {
          status: 'active',
          billingActive: true,
          billingPaymentFailedAt: null,
          lastInvoicePaidAt: Date.now(),
        });
      } else if (email) {
        const userKey = `stellar:user:${email}`;
        const existing = (await kvGet(userKey)) || {};
        const saved = await kvSet(userKey, {
          ...existing,
          billingPaymentFailedAt: null,
          updatedAt: Date.now(),
        });
        if (!saved) throw new Error(`Could not clear invoice failure state for ${invoice.id}`);
      }
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const email = await customerEmail(stripe, invoice.customer);
      if (email && invoiceHasAiReceptionist(invoice)) {
        await updateBusinessServiceBilling(email, {
          status: 'payment_failed',
          billingActive: false,
          billingPaymentFailedAt: Date.now(),
        });
      } else if (email) {
        const userKey = `stellar:user:${email}`;
        const existing = (await kvGet(userKey)) || {};
        const saved = await kvSet(userKey, {
          ...existing,
          billingPaymentFailedAt: Date.now(),
          updatedAt: Date.now(),
        });
        if (!saved) throw new Error(`Could not persist invoice failure for ${invoice.id}`);
      }
      await escalateOwner({ category: 'payment', severity: 'critical', summary: 'A Stellar AI subscription invoice payment failed in Stripe.' });
    } else if (event.type === 'payout.failed') {
      await escalateOwner({ category: 'payment', severity: 'critical', summary: 'A Stellar AI Stripe payout failed and needs owner attention.' });
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const email = String(charge.metadata?.email || charge.billing_details?.email || '').toLowerCase().trim();
      if (charge.metadata?.plan === 'website-builder' && email) {
        const saved = await kvSet(`stellar:website-builder:${email}`, {
          status: 'refunded',
          chargeId: charge.id,
          amountRefunded: Number(charge.amount_refunded || 0),
          updatedAt: Date.now(),
        });
        if (!saved) throw new Error(`Could not revoke website-builder entitlement for ${charge.id}`);
      } else if (charge.metadata?.plan === 'topup' && email) {
        const originalPence = Math.round(Number(charge.metadata?.amount || charge.amount || 0));
        const refundedPence = Math.max(0, Math.round(Number(charge.amount_refunded || 0)));
        if (originalPence >= TOPUP_MIN_PENCE && originalPence <= TOPUP_MAX_PENCE) {
          const userKey = `stellar:user:${email}`;
          const existing = (await kvGet(userKey)) || {};
          const priorRefunded = Math.max(0, Number(existing.topupRefundedPenceByCharge?.[charge.id]) || 0);
          const creditDelta = refundedTopupCreditDelta({
            originalPence,
            previousRefundedPence: priorRefunded,
            currentRefundedPence: refundedPence,
          });
          const saved = await kvSet(userKey, {
            ...existing,
            walletPence: Math.max(0, Number(existing.walletPence) || 0) - creditDelta,
            topupRefundedPenceByCharge: rememberRefundedCharge(existing.topupRefundedPenceByCharge, charge.id, refundedPence),
            updatedAt: Date.now(),
          });
          if (!saved) throw new Error(`Could not reconcile top-up refund for ${charge.id}`);
        }
      }
    } else if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object;
      const charge = typeof dispute.charge === 'string' ? await stripe.charges.retrieve(dispute.charge) : dispute.charge;
      const email = String(charge?.metadata?.email || charge?.billing_details?.email || '').toLowerCase().trim();
      if (charge?.metadata?.plan === 'website-builder' && email) {
        const saved = await kvSet(`stellar:website-builder:${email}`, {
          status: 'disputed',
          chargeId: charge.id,
          disputeId: dispute.id,
          updatedAt: Date.now(),
        });
        if (!saved) throw new Error(`Could not mark website-builder dispute for ${charge.id}`);
      }
      await escalateOwner({ category: 'fraud', severity: 'critical', summary: 'A new Stripe charge dispute was opened for Stellar AI.' });
    } else if (event.type === 'radar.early_fraud_warning.created') {
      await escalateOwner({ category: 'fraud', severity: 'urgent', summary: 'Stripe Radar created an early fraud warning for Stellar AI.' });
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      if (!session.client_reference_id) await incrementConversionMetric('checkout-cancelled-or-expired');
      else await recordCheckoutExpiry({ id: String(session.client_reference_id) });
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const subscriptionCustomerId = stripeObjectId(subscription.customer, 'cus_');
      if (!subscriptionCustomerId) throw new Error(`Deleted Stripe subscription ${subscription.id} is missing a customer identifier`);
      const email = String(subscription.metadata?.email || '').toLowerCase().trim() || await customerEmail(stripe, subscription.customer);
      if (!email) throw new Error(`Deleted Stripe subscription ${subscription.id} could not be mapped to a customer email`);
      if (String(subscription.metadata?.plan || '').toLowerCase() === 'server-pass') {
        const key = `stellar:server-pass:${email}`;
        const existingPass = (await kvGet(key)) || {};
        const saved = await kvSet(key, {
          ...existingPass,
          status: 'canceled',
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: 'canceled',
          updatedAt: Date.now(),
        });
        if (!saved) throw new Error(`Could not revoke Server Pass subscription ${subscription.id}`);
      } else if (email) {
        const userKey = `stellar:user:${email}`;
        const existing = (await kvGet(userKey)) || {};
        const currentSubscriptionId = String(existing.stripeSubscriptionId || '').trim();
        // Ignore deletion of an old duplicate subscription if a newer subscription is recorded.
        if (!currentSubscriptionId || currentSubscriptionId === subscription.id) {
          const saved = await kvSet(userKey, {
            ...existing,
            plan: 'free',
            planBilling: null,
            planCreditAnchorAt: null,
            stripeSubscriptionId: null,
            stripeSubscriptionStatus: 'canceled',
            updatedAt: Date.now(),
          });
          if (!saved) throw new Error(`Could not revoke deleted subscription ${subscription.id}`);
        }
      }
    }

    const marked = await kvSet(eventKey(event.id), { state: 'completed', receivedAt: Date.now(), completedAt: Date.now(), type: event.type }, 60 * 60 * 24 * 30);
    if (!marked) throw new Error(`Could not persist Stripe event marker ${event.id}`);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook failed', error?.message || error);
    if (eventClaimed && event?.id) {
      const released = await kvDelete(eventKey(event.id));
      if (!released) console.error('Could not release failed Stripe event claim', event.id);
    }
    if (event?.id) {
      escalateOwner({
        category: 'payment',
        severity: 'critical',
        summary: `Verified Stripe event ${event.type || 'unknown'} failed during processing.`,
      }).catch((escalationError) => console.error('Payment escalation failed', escalationError?.message || escalationError));
    }
    return res.status(400).json({ error: 'Webhook signature or processing failed.' });
  }
}
