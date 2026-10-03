import { isValidTopupPence, topupBonusPence } from './pricing.js';

export function applyTopupCheckout(existing = {}, { sessionId, amountPence, customerId = '', now = Date.now() } = {}) {
  const id = String(sessionId || '').trim();
  const amount = Math.round(Number(amountPence) || 0);
  const processedAll = Array.isArray(existing.processedTopupSessions)
    ? existing.processedTopupSessions.map((value) => String(value)).filter(Boolean)
    : [];
  if (!id || !isValidTopupPence(amount)) {
    return { record: existing, applied: false, creditAdded: 0, reason: 'invalid' };
  }
  if (processedAll.includes(id)) {
    return { record: existing, applied: false, creditAdded: 0, reason: 'duplicate' };
  }
  const processed = processedAll.slice(-19);
  const bonus = topupBonusPence(amount);
  const creditAdded = amount + bonus;
  return {
    applied: true,
    creditAdded,
    reason: 'applied',
    record: {
      ...existing,
      plan: existing.plan || 'free',
      walletPence: Math.max(0, Number(existing.walletPence) || 0) + creditAdded,
      stripeCustomerId: customerId || existing.stripeCustomerId || null,
      processedTopupSessions: [...processed, id],
      updatedAt: now,
    },
  };
}
