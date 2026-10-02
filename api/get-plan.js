import crypto from 'node:crypto';
// api/get-plan.js — retrieves the signed-in user's plan, add-on credits, usage, referrals, achievements, and plan capabilities
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { incrementConversionMetric, recordCheckoutCancellation } from '../lib/conversion-metrics.js';
import { achievementDefinitions, ensureReferralProfile, kvGet, kvPipeline, unlockedAchievements } from '../lib/profile.js';
import { readApiKeySummary, regenerateApiKey } from '../lib/api-keys.js';
import { MODEL_CREDIT_COSTS, OVERAGE_REQUEST_COST_PENCE, getPlanDefinition, isPaidPlan, normalisePlan } from '../lib/pricing.js';
import { getUsageSnapshot } from '../lib/usage.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
}

const ALLOWED_EVENTS = new Set([
  'homepage-opened',
  'app-opened',
  'chat-sent',
  'model-selected',
  'plan-clicked',
  'checkout-clicked',
  'checkout-started-ui',
  'checkout-cancelled-ui',
  'checkout-success-ui',
  'plugin-opened',
  'support-clicked',
  'settings-opened',
  'active-day',
  'workspace-session-started',
  'return-resumed',
  'thank-you-opened',
  'business-thank-you-opened',
  'ai-receptionist-thank-you-opened',
  'website-audit-thank-you-opened',
]);

const CLIENT_METRIC_EVENTS = new Set([
  'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
  'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error',
  'usage-panel-opened','plans-panel-opened','upgrade-from-usage','business-service-clicked',
  'pricing-view','plan-free-selected','plan-starter-selected','plan-plus-selected','plan-pro-selected',
]);

const clientWindows = new Map();
const ATTRIBUTION_SOURCES = new Set(['direct','github','cfx','builtbybit','google','discord','other']);
const CLIENT_WINDOW_MS = 60_000;
const CLIENT_MAX_PER_WINDOW = 40;

function allowClientMetric(event) {
  const key = String(event || 'client-metric').slice(0, 80);
  const now = Date.now();
  const current = clientWindows.get(key);
  if (!current || now - current.startedAt >= CLIENT_WINDOW_MS) {
    clientWindows.set(key, { startedAt: now, count: 1 });
    if (clientWindows.size > 5000) {
      for (const [storedKey, value] of clientWindows) {
        if (now - value.startedAt >= CLIENT_WINDOW_MS) clientWindows.delete(storedKey);
      }
    }
    return true;
  }
  current.count += 1;
  return current.count <= CLIENT_MAX_PER_WINDOW;
}

async function handleClientMetric(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const event = String(req.body?.event || '').trim().toLowerCase();
  if (!CLIENT_METRIC_EVENTS.has(event)) return res.status(400).json({ error: 'Unknown metric.' });
  if (!allowClientMetric(event)) return res.status(204).end();

  const sourceValue = String(req.body?.source || '').trim().toLowerCase();
  const source = ATTRIBUTION_SOURCES.has(sourceValue) ? sourceValue : 'direct';
  await Promise.all([
    incrementConversionMetric('client-' + event),
    incrementConversionMetric(`client-${event}-source-${source}`),
  ]);
  if (event === 'client-error' || event === 'chat-send-error' || event === 'checkout-error') {
    console.warn('stellar_client_signal', { event });
  }
  return res.status(204).end();
}

function cleanEvent(value) {
  const event = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  return ALLOWED_EVENTS.has(event) ? event : '';
}

function cleanContext(value) {
  const context = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50);
  return context || 'general';
}

async function handlePublicTrackEvent(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const event = cleanEvent(req.body?.event);
  if (!event) return res.status(400).json({ error: 'Unknown analytics event.' });

  // Count broad product movement only. Do not store prompts, names, emails, phone numbers or IP addresses.
  const context = cleanContext(req.body?.context);
  const metric = context === 'general' ? event : `${event}:${context}`;
  const ok = await incrementConversionMetric(metric);
  return res.status(200).json({ ok: Boolean(ok), event, context });
}

function ownerUsage() {
  return {
    plan: 'owner',
    unit: 'credits',
    limit: null,
    used: 0,
    remaining: null,
    resetAt: null,
    creditPeriod: 'unlimited',
  };
}

async function discordCommunityStats() {
  try {
    const response = await fetch('https://discord.com/api/v10/invites/e6uRAV9HGA?with_counts=true&with_expiration=true', {
      headers: { 'User-Agent': 'StellarAI/2.0 (+https://trystellarai.com)' },
    });
    if (!response.ok) return { discordMembers: null, discordOnline: null };
    const invite = await response.json();
    return {
      discordMembers: Math.max(0, Number(invite?.approximate_member_count) || 0) || null,
      discordOnline: Math.max(0, Number(invite?.approximate_presence_count) || 0) || null,
    };
  } catch {
    return { discordMembers: null, discordOnline: null };
  }
}

async function publicStats(url, token) {
  const request = async (path) => {
    const response = await fetch(`${url}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return 0;
    return Math.max(0, Number((await response.json()).result) || 0);
  };
  const [scriptsGenerated, serversPowered, countriesReached, community] = await Promise.all([
    request(`get/${encodeURIComponent('stellar:stats:scripts-generated')}`),
    request(`scard/${encodeURIComponent('stellar:stats:active-builders')}`),
    request(`scard/${encodeURIComponent('stellar:stats:countries')}`),
    discordCommunityStats(),
  ]);
  return { scriptsGenerated, serversPowered, countriesReached, ...community, verified: true };
}

function billingState({ plan, user, owner }) {
  if (owner) return { paid: false, manageable: false, reason: 'owner' };
  if (!isPaidPlan(plan)) return { paid: false, manageable: false, reason: 'free' };
  const customerId = String(user?.stripeCustomerId || '').trim();
  const subscriptionId = String(user?.stripeSubscriptionId || '').trim();
  return {
    paid: true,
    manageable: /^cus_[A-Za-z0-9]+$/.test(customerId),
    customerSynced: /^cus_[A-Za-z0-9]+$/.test(customerId),
    subscriptionSynced: /^sub_[A-Za-z0-9]+$/.test(subscriptionId),
    reason: /^cus_[A-Za-z0-9]+$/.test(customerId) ? 'ready' : 'stripe_syncing',
  };
}

function planCapabilities(plan) {
  const definition = getPlanDefinition(plan);
  return {
    id: definition.id,
    name: definition.name,
    includedCredits: definition.includedCredits,
    creditPeriod: definition.creditPeriod,
    modelCreditCosts: { ...MODEL_CREDIT_COSTS },
    requestsPerHour: definition.requestsPerHour,
    maxTokens: definition.maxTokens,
    models: [...definition.models],
    jarvisTier: String(definition.jarvisTier || 'none'),
    jarvis: {
      enabled: ['voice-vision','pro','owner'].includes(String(definition.jarvisTier || 'none')),
      voice: ['voice-vision','pro','owner'].includes(String(definition.jarvisTier || 'none')),
      vision: ['voice-vision','pro','owner'].includes(String(definition.jarvisTier || 'none')),
      briefings: ['pro','owner'].includes(String(definition.jarvisTier || 'none')),
      proactiveAlerts: ['pro','owner'].includes(String(definition.jarvisTier || 'none')),
      ownerControls: String(definition.jarvisTier || 'none') === 'owner',
    },
    canUseCredit: definition.id !== 'owner',
    overageRequestCostPence: OVERAGE_REQUEST_COST_PENCE,
  };
}

function accountPlanTruth({ plan, owner, user, capabilities, usage, billing }) {
  const walletPence = Math.max(0, Number(user?.walletPence) || 0);
  const billingCycle = isPaidPlan(plan) ? (user?.planBilling === 'annual' ? 'annual' : 'monthly') : null;
  return {
    id: plan,
    name: capabilities.name,
    label: owner ? 'Private' : capabilities.name,
    owner,
    paid: isPaidPlan(plan),
    source: owner ? 'owner-email' : 'account-storage',
    billingCycle,
    billing,
    walletPence,
    addOnCredits: walletPence,
    usage,
    weeklyUsage: null,
    capabilities,
    availableModels: capabilities.models,
    updatedAt: user?.updatedAt || null,
  };
}

function discordProfile(authRecord) {
  const id = /^\d{5,32}$/.test(String(authRecord?.discordId || '')) ? String(authRecord.discordId) : '';
  if (!authRecord?.discord || !id) return { connected: false };
  const username = String(authRecord.discordUsername || '').slice(0, 100);
  const displayName = String(authRecord.discordDisplayName || username || 'Discord user').slice(0, 100);
  const avatarHash = /^[A-Za-z0-9_]{2,128}$/.test(String(authRecord.discordAvatar || '')) ? String(authRecord.discordAvatar) : '';
  return {
    connected: true,
    id,
    username,
    displayName,
    avatarUrl: avatarHash ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=128` : null,
  };
}

async function allowApiKeyMutation(url, token, email) {
  const bucket = Math.floor(Date.now() / 60_000);
  const key = `stellar:api-key-rate:${crypto.createHash('sha256').update(String(email || '')).digest('hex').slice(0, 24)}:${bucket}`;
  const result = await kvPipeline(url, token, [['INCR', key], ['EXPIRE', key, 120, 'NX']]);
  return Math.max(0, Number(Array.isArray(result) ? result[0]?.result : 0) || 0) <= 3;
}

async function handleApiKeyRequest(req, res, url, token, session) {
  if (req.method === 'GET') {
    return res.status(200).json(await readApiKeySummary(url, token, session.email));
  }
  if (String(req.body?.action || '') !== 'regenerate') {
    return res.status(400).json({ error: 'Unknown API key action.' });
  }
  if (!(await allowApiKeyMutation(url, token, session.email))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many key changes. Wait a minute and try again.' });
  }
  const created = await regenerateApiKey(url, token, session.email);
  return res.status(200).json({ ...created.summary, key: created.key });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });

  const mode = String(req.query?.mode || '');
  if (mode === 'track-event') return handlePublicTrackEvent(req, res);
  if (mode === 'client-metric') return handleClientMetric(req, res);

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (req.method === 'GET' && req.query?.stats === 'public') {
    if (!url || !token) return res.status(200).json({ scriptsGenerated: 0, serversPowered: 0, countriesReached: 0, verified: false });
    try {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(await publicStats(url, token));
    } catch {
      return res.status(200).json({ scriptsGenerated: 0, serversPowered: 0, countriesReached: 0, verified: false });
    }
  }

  const session = requireSession(req, res);
  if (!session) return;
  if (!url || !token) return res.status(500).json({ error: 'Account storage is not configured.' });
  if (String(req.query?.mode || '') === 'api-key') {
    try {
      return await handleApiKeyRequest(req, res, url, token, session);
    } catch (error) {
      console.error('API key management failed', error?.message || error);
      return res.status(500).json({ error: 'Could not manage your API key right now.' });
    }
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  if (req.query?.event === 'checkout_cancelled') {
    const tracked = await recordCheckoutCancellation({ id: String(req.query?.attempt || ''), email: session.email });
    return res.status(200).json({ ok: true, tracked });
  }

  try {
    const owner = isOwnerEmail(session.email);
    const [storedValue, authRecord] = await Promise.all([
      kvGet(url, token, `stellar:user:${session.email}`),
      kvGet(url, token, `stellar:auth:${session.email}`),
    ]);
    const stored = storedValue || { plan: 'free', walletPence: 0, createdAt: Date.now() };
    const user = await ensureReferralProfile(url, token, session.email, stored);
    const plan = owner ? 'owner' : (normalisePlan(user.plan) || 'free');
    const creditAnchorAt = Math.max(0, Number(user.planCreditAnchorAt || user.createdAt || Date.now()) || Date.now());
    const usage = owner
      ? ownerUsage()
      : await getUsageSnapshot({ url, token, identity: `email:${session.email}`, plan, creditAnchorAt });
    const achievements = unlockedAchievements(user);
    const websiteBuilderEntitlement = owner
      ? { entitled: true, owner: true, package: 'website-builder', pricePence: 9900, purchasedAt: null }
      : await kvGet(url, token, `stellar:website-builder:${session.email}`);
    const websiteBuilder = owner
      ? websiteBuilderEntitlement
      : {
          entitled: websiteBuilderEntitlement?.status === 'active' && Boolean(websiteBuilderEntitlement?.checkoutSessionId),
          owner: false,
          package: 'website-builder',
          pricePence: 9900,
          purchasedAt: websiteBuilderEntitlement?.status === 'active' ? Number(websiteBuilderEntitlement.purchasedAt) || null : null,
        };
    const capabilities = planCapabilities(plan);
    const billing = billingState({ plan, user, owner });
    const walletPence = Math.max(0, Number(user.walletPence) || 0);
    const planBilling = isPaidPlan(plan) ? (user.planBilling === 'annual' ? 'annual' : 'monthly') : null;
    const accountPlan = accountPlanTruth({ plan, owner, user: { ...user, walletPence, planBilling }, capabilities, usage, billing });

    return res.status(200).json({
      plan,
      planId: plan,
      planName: capabilities.name,
      planLabel: accountPlan.label,
      planKnown: true,
      planSource: accountPlan.source,
      accountPlan,
      owner,
      capabilities,
      availableModels: capabilities.models,
      billing: billingState({ plan, user, owner }),
      walletPence,
      addOnCredits: walletPence,
      overageRequestCostPence: OVERAGE_REQUEST_COST_PENCE,
      planBilling,
      usage,
      weeklyUsage: null,
      referralCode: user.referralCode || null,
      referralUrl: user.referralCode ? `https://trystellarai.com/app?ref=${encodeURIComponent(user.referralCode)}` : null,
      scriptCount: Math.max(0, Number(user.scriptCount) || 0),
      achievements,
      achievementDefinitions: achievementDefinitions(),
      websiteBuilder,
      discord: discordProfile(authRecord),
      updatedAt: user.updatedAt || null,
    });
  } catch (error) {
    console.error('Get plan failed', error?.message || error);
    return res.status(500).json({ error: 'Could not load your plan right now.' });
  }
}
