export const TOPUP_MIN_PENCE = 50;
export const TOPUP_MAX_PENCE = 20000;

export const PLAN_DEFINITIONS = Object.freeze({
  free: {
    id: 'free',
    name: 'Free',
    requestsPerHour: 40,
    maxTokens: 2000,
    models: ['spark', 'star', 'comet'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    requestsPerHour: 120,
    maxTokens: 3500,
    models: ['spark', 'star', 'comet'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    requestsPerHour: 400,
    maxTokens: 5000,
    models: ['spark', 'star', 'comet'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    requestsPerHour: 1600,
    maxTokens: 8000,
    models: ['spark', 'star', 'comet', 'nova'],
  },
  owner: {
    id: 'owner',
    name: 'Owner',
    requestsPerHour: 99999,
    maxTokens: 8000,
    models: ['spark', 'star', 'comet', 'nova'],
  },
});

export const PAID_PLANS = Object.freeze(['starter', 'plus', 'pro']);

export function topupBonusPence(pence) {
  const amount = Math.round(Number(pence) || 0);
  if (amount >= 5000) return Math.round(amount * 0.20);
  if (amount >= 2000) return Math.round(amount * 0.15);
  if (amount >= 1000) return Math.round(amount * 0.10);
  if (amount >= 500) return Math.round(amount * 0.05);
  return 0;
}

export function clampTopupPence(value) {
  const amount = Math.round(Number(value) || 0);
  return Math.max(TOPUP_MIN_PENCE, Math.min(TOPUP_MAX_PENCE, amount));
}

/**
 * Converts current and historic Stripe/client identifiers to the server-owned
 * entitlement name. `lite` is retained as a read compatibility alias for Plus.
 */
export function normalisePlan(plan) {
  const value = String(plan || '').trim().toLowerCase();
  if (value === 'starter' || value === 'starter-annual') return 'starter';
  if (value === 'plus' || value === 'plus-annual' || value === 'lite' || value === 'lite-annual') return 'plus';
  if (value === 'pro' || value === 'pro-annual') return 'pro';
  if (value === 'free') return 'free';
  return null;
}

export function getPlanDefinition(plan) {
  if (String(plan || '').trim().toLowerCase() === 'owner') return PLAN_DEFINITIONS.owner;
  return PLAN_DEFINITIONS[normalisePlan(plan) || 'free'];
}

export function isPaidPlan(plan) {
  return PAID_PLANS.includes(normalisePlan(plan));
}
