export const TOPUP_MIN_PENCE = 50;
export const TOPUP_MAX_PENCE = 20000;

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

export function normalisePlan(plan) {
  if (plan === 'lite' || plan === 'lite-annual') return 'lite';
  if (plan === 'pro' || plan === 'pro-annual') return 'pro';
  return null;
}
