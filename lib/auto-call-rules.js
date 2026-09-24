export const OWNER_AUTO_CALL_CATEGORIES = Object.freeze([
  'security',
  'fraud',
  'payment',
  'refund',
  'lead',
  'customer',
  'service',
  'approval',
]);

export const DEFAULT_OWNER_CALL_POLICY = Object.freeze({
  enabled: true,
  cooldownMinutes: 15,
  categories: OWNER_AUTO_CALL_CATEGORIES,
});

const RULES = Object.freeze([
  { category: 'security', severity: 'critical', reason: 'security or account risk', terms: ['account compromised', 'hacked', 'breach', 'security alert', 'unauthorised login', 'unauthorized login', 'password reset', 'verification code', '2fa', 'two factor'] },
  { category: 'fraud', severity: 'critical', reason: 'fraud, dispute or chargeback risk', terms: ['fraud', 'chargeback', 'dispute', 'unauthorised charge', 'unauthorized charge', 'stolen card', 'suspicious payment', 'radar warning'] },
  { category: 'payment', severity: 'critical', reason: 'payment, checkout or payout failure', terms: ['payment failed', 'invoice failed', 'card declined', 'checkout broken', 'checkout failed', 'payout failed', 'stripe failed', 'billing failed', 'subscription failed'] },
  { category: 'refund', severity: 'urgent', reason: 'refund or cancellation request', terms: ['refund', 'money back', 'cancel my plan', 'cancel subscription', 'not happy with purchase', 'want to cancel'] },
  { category: 'lead', severity: 'urgent', reason: 'high-signal sales lead or partnership reply', terms: ['interested', 'book a demo', 'schedule a demo', 'partnership', 'proposal', 'send a quote', 'quote please', 'pricing for', 'paid plan', 'business enquiry', 'business inquiry'] },
  { category: 'customer', severity: 'urgent', reason: 'important customer support issue', terms: ['urgent support', 'angry customer', 'complaint', 'canâ€™t log in', "can't log in", 'cannot log in', 'not working', 'broken account', 'important customer'] },
  { category: 'service', severity: 'critical', reason: 'service outage or production failure', terms: ['website down', 'site down', 'production failed', 'deployment failed', 'vercel failed', 'build failed', 'outage', 'api down', 'server error'] },
  { category: 'approval', severity: 'urgent', reason: 'owner approval needed', terms: ['approval needed', 'please approve', 'need approval', 'owner approval', 'decision needed', 'confirm urgently', 'needs your decision'] },
]);
function text(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function termsText(input = {}) {
  return [
    input.from,
    input.subject,
    input.snippet,
    input.body,
    input.summary,
    input.routeReason,
    input.team,
  ].map(text).join(' ').toLowerCase();
}

export function normalizeOwnerCallPolicy(input = {}) {
  const requestedCategories = Array.isArray(input.categories) ? [...DEFAULT_OWNER_CALL_POLICY.categories, ...input.categories] : DEFAULT_OWNER_CALL_POLICY.categories;
  const categories = [...new Set(requestedCategories
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((value) => OWNER_AUTO_CALL_CATEGORIES.includes(value)))] || [];
  return {
    enabled: input.enabled !== false,
    cooldownMinutes: Math.min(60, Math.max(15, Number(input.cooldownMinutes) || DEFAULT_OWNER_CALL_POLICY.cooldownMinutes)),
    categories: categories.length ? categories : DEFAULT_OWNER_CALL_POLICY.categories,
  };
}
export function classifyOwnerAutoCall(input = {}) {
  const haystack = termsText(input);
  if (!haystack) return { shouldCall: false, category: 'none', severity: 'info', reason: 'empty-signal' };
  for (const rule of RULES) {
    const matchedTerm = rule.terms.find((term) => haystack.includes(term));
    if (matchedTerm) {
      return {
        shouldCall: true,
        category: rule.category,
        severity: rule.severity,
        reason: rule.reason,
        matchedTerm,
      };
    }
  }
  return { shouldCall: false, category: 'none', severity: 'info', reason: 'not-urgent' };
}

export function ownerCallPolicySummary(policy = DEFAULT_OWNER_CALL_POLICY) {
  const normalized = normalizeOwnerCallPolicy(policy);
  return `Auto-calls: ${normalized.enabled ? 'on' : 'off'} Â· ${normalized.cooldownMinutes} minute cooldown Â· categories: ${normalized.categories.join(', ')}`;
}
