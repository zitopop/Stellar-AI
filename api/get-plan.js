// api/get-plan.js — retrieves the signed-in user's plan, wallet, usage, referrals, and achievements
import { isOwnerEmail, requireSession } from '../lib/auth.js';
import { recordCheckoutCancellation } from '../lib/conversion-metrics.js';
import { achievementDefinitions, ensureReferralProfile, kvGet, unlockedAchievements } from '../lib/profile.js';
import { getPlanDefinition, isPaidPlan, normalisePlan } from '../lib/pricing.js';
import { getUsageSnapshot } from '../lib/usage.js';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Vary', 'Origin');
}

function ownerUsage() {
  const definition = getPlanDefinition('owner');
  return {
    plan: 'owner',
    limit: definition.requestsPerHour,
    used: 0,
    remaining: definition.requestsPerHour,
    resetAt: new Date(Math.floor(Date.now() / 3600000 + 1) * 3600000).toISOString(),
  };
}

async function publicStats(url, token) {
  const request = async (path) => {
    const response = await fetch(`${url}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return 0;
    return Math.max(0, Number((await response.json()).result) || 0);
  };
  const [scriptsGenerated, serversPowered, countriesReached] = await Promise.all([
    request(`get/${encodeURIComponent('stellar:stats:scripts-generated')}`),
    request(`scard/${encodeURIComponent('stellar:stats:active-builders')}`),
    request(`scard/${encodeURIComponent('stellar:stats:countries')}`),
  ]);
  return { scriptsGenerated, serversPowered, countriesReached, verified: true };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (req.query?.stats === 'public') {
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

  if (req.query?.event === 'checkout_cancelled') {
    const tracked = await recordCheckoutCancellation({ id: String(req.query?.attempt || ''), email: session.email });
    return res.status(200).json({ ok: true, tracked });
  }

  if (!url || !token) return res.status(500).json({ error: 'Account storage is not configured.' });

  try {
    const owner = isOwnerEmail(session.email);
    const stored = (await kvGet(url, token, `stellar:user:${session.email}`)) || { plan: 'free', walletPence: 0, createdAt: Date.now() };
    const user = await ensureReferralProfile(url, token, session.email, stored);
    const plan = owner ? 'owner' : (normalisePlan(user.plan) || 'free');
    const usage = owner
      ? ownerUsage()
      : await getUsageSnapshot({ url, token, identity: `email:${session.email}`, plan });
    const achievements = unlockedAchievements(user);

    return res.status(200).json({
      plan,
      owner,
      walletPence: Math.max(0, Number(user.walletPence) || 0),
      planBilling: isPaidPlan(plan) ? (user.planBilling === 'annual' ? 'annual' : 'monthly') : null,
      usage,
      referralCode: user.referralCode || null,
      referralUrl: user.referralCode ? `https://trystellarai.com/app?ref=${encodeURIComponent(user.referralCode)}` : null,
      scriptCount: Math.max(0, Number(user.scriptCount) || 0),
      achievements,
      achievementDefinitions: achievementDefinitions(),
      updatedAt: user.updatedAt || null,
    });
  } catch (error) {
    console.error('Get plan failed', error?.message || error);
    return res.status(500).json({ error: 'Could not load your plan right now.' });
  }
}
