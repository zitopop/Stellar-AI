import { topupCredits } from './pricing.js';

const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);
const REVOKE_STATUSES = new Set(['canceled', 'unpaid', 'incomplete_expired', 'paused']);

export function subscriptionHasAccess(status) {
  return ACCESS_STATUSES.has(String(status || '').trim().toLowerCase());
}

export function subscriptionShouldRevoke(status) {
  return REVOKE_STATUSES.has(String(status || '').trim().toLowerCase());
}

export function refundedTopupCreditDelta({ originalPence, previousRefundedPence = 0, currentRefundedPence = 0 } = {}) {
  const original = Math.max(0, Math.round(Number(originalPence) || 0));
  if (!original) return 0;

  const previous = Math.max(0, Math.min(original, Math.round(Number(previousRefundedPence) || 0)));
  const current = Math.max(previous, Math.min(original, Math.round(Number(currentRefundedPence) || 0)));
  const totalCredits = topupCredits(original);
  const creditedBefore = Math.round(totalCredits * (previous / original));
  const creditedNow = Math.round(totalCredits * (current / original));
  return Math.max(0, creditedNow - creditedBefore);
}

export function rememberRefundedCharge(refunds = {}, chargeId, refundedPence) {
  const id = String(chargeId || '').trim();
  if (!id) return refunds && typeof refunds === 'object' ? refunds : {};
  const entries = Object.entries(refunds && typeof refunds === 'object' ? refunds : {})
    .filter(([key]) => key && key !== id)
    .slice(-19);
  return Object.fromEntries([...entries, [id, Math.max(0, Math.round(Number(refundedPence) || 0))]]);
}
