import { startOwnerCall } from './owner-call.js';

const URGENT_CATEGORIES = new Set([
  'security',
  'fraud',
  'payment',
  'important_customer',
  'service_failure',
  'approval_required',
]);

const memory = globalThis.__stellarJarvisCallCooldowns || new Map();
globalThis.__stellarJarvisCallCooldowns = memory;

function clampCooldown(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return [5, 15, 30, 60].includes(parsed) ? parsed : 15;
}

function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function getJarvisAutoCallPolicy() {
  return {
    enabled: String(process.env.JARVIS_AUTO_CALL_ENABLED || 'true').toLowerCase() !== 'false',
    cooldownMinutes: clampCooldown(process.env.JARVIS_CALL_COOLDOWN_MINUTES),
    categories: [...URGENT_CATEGORIES],
  };
}

export function shouldJarvisCallOwner({ category, urgent = true } = {}) {
  const policy = getJarvisAutoCallPolicy();
  const normalized = normalizeCategory(category);
  if (!policy.enabled || !urgent || !URGENT_CATEGORIES.has(normalized)) {
    return { call: false, category: normalized, reason: 'not-approved-for-auto-call' };
  }
  const last = memory.get(normalized) || 0;
  const remainingMs = policy.cooldownMinutes * 60_000 - (Date.now() - last);
  if (remainingMs > 0) {
    return { call: false, category: normalized, reason: 'cooldown', retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }
  return { call: true, category: normalized, reason: 'urgent-approved-category' };
}

export async function maybeAutoCallOwner({ category, purpose, urgent = true, metadata = {}, authorization = '', bridgeToken = '' } = {}) {
  const decision = shouldJarvisCallOwner({ category, urgent });
  if (!decision.call) return { ok: true, called: false, decision };

  const safePurpose = String(purpose || `Jarvis needs the owner about ${decision.category}.`).trim().slice(0, 300);
  const result = await startOwnerCall({
    purpose: safePurpose,
    authorization,
    bridgeToken,
    metadata: { ...metadata, autoCall: true, urgent: true, category: decision.category },
  });

  // Only start cooldown after a provider accepted the call request.
  if (result?.ok && result?.call_id) memory.set(decision.category, Date.now());
  return { ...result, called: Boolean(result?.ok && result?.call_id), decision };
}
