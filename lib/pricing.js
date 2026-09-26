export const TOPUP_MIN_PENCE = 1000;
export const TOPUP_MAX_PENCE = 20000;

// Add-on credits map 1:1 to pence so a £10 top-up buys 1,000 base credits
// before the existing bonus schedule is applied.
export const ADDON_CREDITS_PER_PENCE = 1;
export const OVERAGE_REQUEST_COST_PENCE = 5;

export const MODEL_CREDIT_COSTS = Object.freeze({
  spark: 2,
  star: 5,
  comet: 10,
  nova: 20,
});

export const PLAN_DEFINITIONS = Object.freeze({
  free: {
    id: 'free',
    name: 'Free',
    requestsPerHour: 40, // retained as an internal abuse ceiling, not the customer allowance
    includedCredits: 300,
    creditPeriod: 'day',
    maxTokens: 2000,
    models: ['spark', 'star'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    requestsPerHour: 120,
    includedCredits: 4000,
    creditPeriod: 'month',
    maxTokens: 3500,
    models: ['spark', 'star'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    requestsPerHour: 400,
    includedCredits: 12000,
    creditPeriod: 'month',
    maxTokens: 5000,
    models: ['spark', 'star', 'comet'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    requestsPerHour: 1600,
    includedCredits: 48000,
    creditPeriod: 'month',
    maxTokens: 8000,
    models: ['spark', 'star', 'comet', 'nova'],
  },
  owner: {
    id: 'owner',
    name: 'Owner',
    requestsPerHour: 99999,
    includedCredits: null,
    creditPeriod: 'unlimited',
    maxTokens: 8000,
    models: ['spark', 'star', 'comet', 'nova'],
  },
});

// Weekly limits remain available as an internal safety control for legacy deployments,
// but customer-facing plan value is now expressed in credits.
export function getWeeklyRequestLimit(plan, env = process.env) {
  const id = getPlanDefinition(plan).id;
  if (id === 'owner') return null;
  const key = `STELLAR_WEEKLY_LIMIT_${id.toUpperCase()}`;
  const value = Number(env?.[key]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export const PAID_PLANS = Object.freeze(['starter', 'plus', 'pro']);

export function creditCostForModel(model) {
  const key = String(model || 'star').trim().toLowerCase();
  return MODEL_CREDIT_COSTS[key] || MODEL_CREDIT_COSTS.star;
}

export function topupBonusPence(pence) {
  const amount = Math.round(Number(pence) || 0);
  if (amount >= 5000) return Math.round(amount * 0.20);
  if (amount >= 2000) return Math.round(amount * 0.15);
  if (amount >= 1000) return Math.round(amount * 0.10);
  if (amount >= 500) return Math.round(amount * 0.05);
  return 0;
}

export function topupCredits(pence) {
  const amount = Math.max(0, Math.round(Number(pence) || 0));
  return (amount + topupBonusPence(amount)) * ADDON_CREDITS_PER_PENCE;
}

export function clampTopupPence(value) {
  const amount = Math.round(Number(value) || 0);
  return Math.max(TOPUP_MIN_PENCE, Math.min(TOPUP_MAX_PENCE, amount));
}

export function isValidTopupPence(value) {
  if (typeof value !== 'number') return false;
  const amount = value;
  return Number.isInteger(amount)
    && amount >= TOPUP_MIN_PENCE
    && amount <= TOPUP_MAX_PENCE
    && amount % 50 === 0;
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
