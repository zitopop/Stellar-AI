import { getPlanDefinition, normalisePlan } from './pricing.js';

function parse(result) {
  if (result === null || result === undefined) return null;
  try { return JSON.parse(result); } catch { return null; }
}

function hourWindow(now = Date.now()) {
  const resetAt = Math.floor(now / 3600000 + 1) * 3600000;
  const bucket = new Date(now).toISOString().slice(0, 13).replace(/[-T:]/g, '');
  return { resetAt, bucket, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function identityKey(identity) {
  const value = String(identity || 'anonymous').trim().toLowerCase().slice(0, 180);
  return value || 'anonymous';
}

function counterKey(identity, now) {
  const { bucket } = hourWindow(now);
  return `stellar:usage:${bucket}:${identityKey(identity)}`;
}

async function kvGet(url, token, key) {
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Usage storage read failed');
  return parse((await response.json()).result);
}

async function kvIncrement(url, token, key, seconds) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // INCR assigns a unique count even for concurrent requests. EXPIRE NX makes
    // the TTL belong to the UTC-hour bucket without extending it on every use.
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, seconds, 'NX']]),
  });
  if (!response.ok) throw new Error('Usage storage write failed');
  const results = await response.json();
  return Math.max(0, Number(results?.[0]?.result) || 0);
}

export function usageSnapshotFromRecord(plan, record, now = Date.now()) {
  const canonicalPlan = normalisePlan(plan) || 'free';
  const definition = getPlanDefinition(canonicalPlan);
  const window = hourWindow(now);
  const count = typeof record === 'number'
    ? Math.max(0, record)
    : record && record.resetAt === window.resetAt ? Math.max(0, Number(record.count) || 0) : 0;
  return {
    plan: canonicalPlan,
    limit: definition.requestsPerHour,
    used: count,
    remaining: Math.max(0, definition.requestsPerHour - count),
    resetAt: new Date(window.resetAt).toISOString(),
  };
}

export async function getUsageSnapshot({ url, token, identity, plan, now = Date.now() }) {
  const record = await kvGet(url, token, counterKey(identity, now));
  return usageSnapshotFromRecord(plan, record, now);
}

/**
 * Consumes one request against a current UTC-hour bucket. Redis remains the
 * enforcement point; callers should fail closed only when their application
 * cannot safely serve an unmetered paid request.
 */
export async function consumeUsage({ url, token, identity, plan, now = Date.now() }) {
  const key = counterKey(identity, now);
  const window = hourWindow(now);
  const count = await kvIncrement(url, token, key, window.ttlSeconds);
  const snapshot = usageSnapshotFromRecord(plan, count, now);
  return { ...snapshot, allowed: snapshot.used <= snapshot.limit };
}

export { hourWindow, identityKey };
